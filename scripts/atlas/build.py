"""Build the Human Rights Atlas data files (data/atlas) from the official sources.

    python3 scripts/atlas/build.py            use the local cache where a document was already fetched
    python3 scripts/atlas/build.py --refresh  fetch every document again

The run is idempotent: an unchanged source leaves the files untouched. A source that cannot be
reached keeps the data of the last successful run (with its date) and is listed in report.json.
A change in the text of a provision is not published silently: it is written to
pending-changes.json and the previous text stays until the change is reviewed (see review.py).
"""
from __future__ import annotations

import re
import sys
import traceback
from datetime import datetime, timezone

import src_au
import src_oas
import src_texts
import src_un
from catalog import AU, COE, OAS, UN_CORE, UN_REFUGEES, UN_REGISTER_EXTRA
from common import DATA, TODAY, SourceUnavailable, fetch_log, fold, log, one_line, read_json, source_ref, write_json
from src_countries import Resolver, load_m49

REPORT: dict = {"run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "steps": {}, "errors": [], "unavailable": []}


def step(name: str):
    def wrap(fn):
        def run(*args, **kwargs):
            log(f"· {name}")
            try:
                result = fn(*args, **kwargs)
                REPORT["steps"][name] = {"ok": True}
                return result
            except SourceUnavailable as error:
                REPORT["steps"][name] = {"ok": False, "unavailable": str(error)}
                REPORT["unavailable"].append({"step": name, "detail": str(error)})
                log(f"  no disponible: {error}")
                return None
            except Exception as error:  # an adapter failure must not stop the others
                REPORT["steps"][name] = {"ok": False, "error": f"{type(error).__name__}: {error}"}
                REPORT["errors"].append({"step": name, "detail": f"{type(error).__name__}: {error}", "trace": traceback.format_exc()[-1500:]})
                log(f"  ERROR: {error}")
                return None
        return run
    return wrap


# ---------------------------------------------------------------- countries

@step("Países y nombres oficiales (M49)")
def countries_step():
    countries, ref = load_m49()
    return countries, ref


# ---------------------------------------------------------------- United Nations

UN_KIND = {"un-icescr-op": "optional_protocol", "un-iccpr-op1": "optional_protocol", "un-iccpr-op2": "optional_protocol",
           "un-cedaw-op": "optional_protocol", "un-opcat": "optional_protocol", "un-crc-opac": "optional_protocol",
           "un-crc-opsc": "optional_protocol", "un-crc-opic": "optional_protocol", "un-crpd-op": "optional_protocol"}


def statements_for(sections: list[dict], name: str) -> list[dict]:
    """Every entry of the register's text sections under a participant's name, each kept whole with
    the section title and, for declarations and reservations, the depositary's own headings."""
    out = []
    for section in sections:
        for entry in section["entries"]:
            if fold(entry["name"]) != fold(name):
                continue
            base = {"section": section["key"], "section_title": section["title"], "notes": entry["notes"]}
            if section["key"] == "Dec" and entry.get("parts"):
                for part in entry["parts"]:
                    out.append({**base, "label": part["label"], "kind": src_un.label_kind(part["label"]), "text": part["text"]})
            elif entry["text"]:
                kind = {"Obj": "objection", "DecUnderArticle": "competence_declaration", "Notifications": "notification"}.get(section["key"], "other")
                out.append({**base, "label": None, "kind": kind, "text": entry["text"]})
    return out


@step("Naciones Unidas: registro del depositario (UNTC)")
def un_step(resolve: Resolver):
    found = src_un.discover_un()
    instruments, participation = {}, {}
    ids = [(i, b, p, "core") for i, _, b, p in UN_CORE] + [(i, None, p, k) for i, _, k, p in UN_REGISTER_EXTRA] + [(i, None, p, k) for i, _, k, p in UN_REFUGEES]
    for instrument_id, body, parent, category in ids:
        entry = found[instrument_id]
        register = src_un.parse_untc(entry["mtdsg"], entry["chapter"])
        meta = register["meta"]
        kind = "amendment" if category == "amendment" else UN_KIND.get(instrument_id) or ("protocol" if parent else "treaty")
        instruments[instrument_id] = {
            "id": instrument_id, "system": "un", "kind": kind, "category": "core" if category == "core" else "related" if category == "related" else "core",
            "parent": parent, "title_en": entry["title"], "concluded_text": entry.get("place_date"), "concluded": src_un.en_date(entry.get("place_date") or ""),
            "entry_into_force": {"date": meta["entry_into_force"], "text": meta["entry_into_force_text"], "ref": meta["ref"]},
            "registration": meta["registration_text"], "text_reference": meta["text_reference"], "register_notes": meta["notes"],
            "status": {"signatories": meta["signatories"], "parties": meta["parties"], "as_of": meta["as_of"], "ref": meta["ref"]},
            "depositary": "Secretario General de las Naciones Unidas",
            "registry": {"untc": entry["mtdsg"], "untc_chapter": entry["chapter"], "untc_url": src_un.untc_url(entry["mtdsg"], entry["chapter"])},
            "bodies": [body] if body else [],
        }
        if entry.get("dashboard"):
            instruments[instrument_id]["registry"]["ohchr_dashboard"] = entry["dashboard"]["Acronym"]
        participants = []
        for p in register["participants"]:
            participants.append({
                "iso3": resolve(p["name"], "untc"),
                "name": p["name"],
                "signature": p.get("signature"),
                "signature_bracketed": p.get("signature_bracketed") or None,
                "consent": p.get("consent"),
                "notes": p.get("notes") or [],
                "statements": statements_for(register["sections"], p["name"]),
            })
        # States that appear only in the text sections (an objection by a State that is not a party,
        # for instance) keep their statements too.
        listed = {fold(p["name"]) for p in register["participants"]}
        extra_names = sorted({e["name"] for s in register["sections"] for e in s["entries"] if fold(e["name"]) not in listed})
        for name in extra_names:
            participants.append({"iso3": resolve(name, "untc"), "name": name, "signature": None, "consent": None, "notes": [],
                                 "statements": statements_for(register["sections"], name), "listed": False})
        participation[instrument_id] = {
            "instrument": instrument_id, "register": "untc", "as_of": meta["as_of"], "ref": meta["ref"], "columns": register["columns"],
            "legend": "Códigos del depositario: a = adhesión, d = sucesión, A = aceptación, AA = aprobación, c = confirmación formal; sin código = ratificación (salvo que la cabecera indique otro tipo).",
            "sections": [{"key": s["key"], "title": s["title"], "intro": s["intro"], "entries": len(s["entries"])} for s in register["sections"]],
            "notes": register["notes"], "participants": participants,
        }
    return instruments, participation


TB_ACRONYMS = {"CERD": "un-icerd", "CESCR": "un-icescr", "CCPR": "un-iccpr", "CCPR-OP2-DP": "un-iccpr-op2", "CEDAW": "un-cedaw", "CAT": "un-cat",
               "CAT-OP": "un-opcat", "CRC": "un-crc", "CRC-OP-AC": "un-crc-opac", "CRC-OP-SC": "un-crc-opsc", "CMW": "un-cmw", "CRPD": "un-crpd",
               "CED": "un-ced"}
# Procedure codes of the treaty body database → instrument and article that establish the procedure.
TB_PROCEDURES = {
    "CAT, artículo 22": ("un-cat", "22"), "CCPR-OP1": ("un-iccpr-op1", "1"), "CED, artículo 31": ("un-ced", "31"), "CEDAW-OP": ("un-cedaw-op", "2"),
    "CERD, artículo 14": ("un-icerd", "14"), "CESCR-OP": ("un-icescr-op", "2"), "CMW, artículo 77": ("un-cmw", "77"),
    "CRC-OP-IC": ("un-crc-opic", "5"), "CRPD-OP": ("un-crpd-op", "1"),
    "CAT, Art.20": ("un-cat", "20"), "CED, Art.33": ("un-ced", "33"), "CEDAW-OP, Art. 8-9": ("un-cedaw-op", "8"),
    "CESCR-OP, Art.11": ("un-icescr-op", "11"), "CRC-OP-IC, Art.13": ("un-crc-opic", "13"), "CRPD-OP, Art.6-7": ("un-crpd-op", "6"),
}


@step("ACNUDH: base de datos de órganos de tratados (entrada en vigor y procedimientos)")
def tb_step(resolve: Resolver):
    countries = src_un.tb_countries()
    by_country = {}
    for country in countries:
        iso3 = resolve(country["name_es"], "tbinternet")
        data = src_un.tb_country(country["tb_id"])
        by_country[country["tb_id"]] = {"iso3": iso3, "name_es": country["name_es"], **data}
    return by_country


# ---------------------------------------------------------------- texts

def text_file(instrument_id: str, lang: str, result: dict, previous: dict | None, pending: list) -> dict:
    """Keep the published text when a provision changed, until the change is reviewed."""
    if previous and previous.get("quality", {}).get("complete") and result["quality"]["complete"]:
        old = {n["id"]: [p.get("text") for p in n.get("paragraphs", [])] for n in previous["nodes"] if n["kind"] == "article"}
        new = {n["id"]: [p.get("text") for p in n.get("paragraphs", [])] for n in result["nodes"] if n["kind"] == "article"}
        changed = sorted(k for k in set(old) | set(new) if old.get(k) != new.get(k))
        if changed:
            pending.append({"instrument": instrument_id, "lang": lang, "articles": changed, "detected": TODAY,
                            "source": result["source"], "reason": "El texto de estas disposiciones ha cambiado en la fuente."})
            kept = dict(previous)
            kept["pending_review"] = {"since": TODAY, "articles": changed}
            return kept
    return result


@step("Textos (BOE, Naciones Unidas, OEA, Unión Africana)")
def texts_step(oas_found: dict | None, au_found: dict | None):
    previous_pending = read_json(DATA / "pending-changes.json", [])
    pending: list = [p for p in previous_pending if not p.get("resolved")]
    results = {}

    def keep(instrument_id: str, lang: str, build, authority: str):
        path = DATA / "texts" / f"{instrument_id}.{lang}.json"
        previous = read_json(path)
        try:
            result = build()
        except SourceUnavailable as error:
            REPORT["unavailable"].append({"step": f"texto {instrument_id}.{lang}", "detail": str(error)})
            if previous:
                results[(instrument_id, lang)] = previous
            return
        except Exception as error:
            REPORT["errors"].append({"step": f"texto {instrument_id}.{lang}", "detail": f"{type(error).__name__}: {error}"})
            if previous:
                results[(instrument_id, lang)] = previous
            return
        result = {"instrument": instrument_id, "authority": authority, **result}
        results[(instrument_id, lang)] = text_file(instrument_id, lang, result, previous, pending)

    for instrument_id in src_texts.BOE_TEXTS:
        authority = "authentic" if instrument_id.startswith("un-") else "official_es"
        keep(instrument_id, "es", lambda i=instrument_id: src_texts.from_boe(i), authority)

    keep("un-udhr", "es", lambda: src_texts.from_html("https://www.un.org/es/about-us/universal-declaration-of-human-rights", lang="es",
         publisher="Naciones Unidas", document="Declaración Universal de Derechos Humanos", start=r"^Pre[áa]mbulo$", selector="div.article-body", adapter="un.org",
         declaration=True), "body")
    keep("un-udhr", "en", lambda: src_texts.from_html("https://www.un.org/en/about-us/universal-declaration-of-human-rights", lang="en",
         publisher="United Nations", document="Universal Declaration of Human Rights", start=r"^Preamble$", selector="div.article-body", adapter="un.org",
         declaration=True), "body")
    keep("au-achpr", "en", lambda: src_texts.from_html("https://achpr.au.int/en/charter/african-charter-human-and-peoples-rights", lang="en",
         publisher="African Commission on Human and Peoples' Rights", document="African Charter on Human and Peoples' Rights", start=r"^PREAMBLE",
         selector="main", adapter="achpr", instrument="au-achpr"), "body")
    keep("oas-american-declaration", "es", lambda: src_texts.from_html("https://www.oas.org/es/cidh/mandato/Basicos/declaracion.asp", lang="es",
         publisher="Organización de los Estados Americanos, Comisión Interamericana de Derechos Humanos", document="Declaración Americana de los Derechos y Deberes del Hombre",
         start=r"^(CAP[ÍI]TULO PRIMERO|Pre[áa]mbulo|PRE[ÁA]MBULO|Todos los hombres nacen libres)", end=r"^(Aprobada en la Novena|/rightcol)", adapter="oas",
         breaks=("container", "newline", "unwrap"), declaration=True, headings_beside=True, instrument="oas-american-declaration"), "body")
    for instrument_id, code, *_ in OAS:
        url = (oas_found or {}).get(instrument_id, {}).get("text")
        if not url:
            continue

        def build_oas(url=url, code=code):
            final_url, _, _ = src_oas.text_page(url)
            return src_texts.from_html(final_url, lang="es", publisher="Organización de los Estados Americanos, Departamento de Derecho Internacional",
                                       document=f"Texto del tratado {code}", start=r"^(PRE[ÁA]MBULO|Pre[áa]mbulo|Los Estados|LOS ESTADOS)",
                                       adapter="oas", breaks=("container", "newline", "unwrap"))
        keep(instrument_id, "es", build_oas, "depositary")
    import src_docs
    for instrument_id in src_docs.DOCUMENTS:
        keep(instrument_id, src_docs.DOCUMENTS[instrument_id][1], lambda i=instrument_id: src_docs.un_document(i), "body")
    for instrument_id in src_docs.HTML_DOCUMENTS:
        keep(instrument_id, "es", lambda i=instrument_id: src_docs.html_document(i), "body")
    for instrument_id, spec in src_docs.PDF_DOCUMENTS.items():
        keep(instrument_id, spec[1], lambda i=instrument_id: src_docs.pdf_document(i), "body")
    return results, pending


# ---------------------------------------------------------------- OAS and AU

@step("OEA: textos y firmas y ratificaciones")
def oas_step(resolve: Resolver):
    found = src_oas.discover()
    instruments, participation = {}, {}
    for instrument_id, code, kind, parent, bodies in OAS:
        entry = found[instrument_id]
        signatures = src_oas.signatures(entry["signatures"])
        head = signatures["head"]
        instruments[instrument_id] = {
            "id": instrument_id, "system": "oas", "kind": kind, "category": "regional", "parent": parent,
            "index_label": entry.get("label"),
            "concluded": head.get("adopted"), "concluded_text": head.get("adopted_place"),
            "entry_into_force": {"date": head.get("entry_into_force"), "text": head.get("entry_into_force_text"), "ref": signatures["ref"]},
            "depositary": head.get("depositary"),
            "status": {"parties": sum(1 for p in signatures["participants"] if p.get("consent")),
                       "signatories": sum(1 for p in signatures["participants"] if p.get("signature")), "as_of": None, "ref": signatures["ref"],
                       "counted": True},
            "registry": {"oas": code, "oas_text_url": entry["text"], "oas_signatures_url": entry["signatures"]},
            "bodies": bodies,
        }
        participation[instrument_id] = {
            "instrument": instrument_id, "register": "oas", "as_of": None, "ref": signatures["ref"],
            "legend": "Códigos del depositario (Secretaría General de la OEA): RA = ratificación, AD = adhesión, AC = aceptación. Fechas publicadas en formato mes/día/año.",
            "statements_text": signatures.get("statements_text"),
            "participants": [{
                "iso3": resolve(p["name"], "oas"), "name": p["name"], "signature": p.get("signature"), "consent": p.get("consent"),
                "deposit": p.get("deposit"), "date_reading": p.get("date_reading"),
                "statements": [{"section": "oas", "section_title": "Declaraciones, reservas, denuncias y retiros", "label": None, "kind": "other", "text": t}
                               for t in signatures["statements"].get(p["name"], [])],
            } for p in signatures["participants"]],
        }
    return found, instruments, participation


@step("Unión Africana: tratados y listas de estado")
def au_step(resolve: Resolver):
    found = src_au.discover()
    instruments, participation = {}, {}
    for instrument_id, slug, kind, parent, bodies in AU:
        entry = found[instrument_id]
        adopted, precision = entry["fields"]["adopted"]
        eif, _ = entry["fields"]["entry_into_force"]
        status = src_au.status_list(entry["status_list"]) if entry["status_list"] else None
        instruments[instrument_id] = {
            "id": instrument_id, "system": "au", "kind": kind, "category": "regional", "parent": parent, "title_en": entry["title"],
            "concluded": adopted, "concluded_precision": precision,
            "entry_into_force": {"date": eif, "text": None, "ref": entry["ref"]},
            "depositary": "Comisión de la Unión Africana",
            "status": {"parties": sum(1 for p in status["participants"] if p.get("consent")) if status else None,
                       "signatories": sum(1 for p in status["participants"] if p.get("signature")) if status else None,
                       "as_of": status["as_of"] if status else None, "ref": status["ref"] if status else entry["ref"], "counted": True},
            "registry": {"au": slug, "au_url": entry["ref"]["url"], "au_status_list": entry["status_list"],
                         "au_texts": entry["texts"]},
            "bodies": bodies,
        }
        if status:
            participation[instrument_id] = {
                "instrument": instrument_id, "register": "au", "as_of": status["as_of"], "ref": status["ref"],
                "legend": "La lista de la Unión Africana recoge la fecha de firma, la de ratificación o adhesión (sin distinguirlas) y la de depósito.",
                "participants": [{"iso3": resolve(p["name"], "au"), "name": p["name"], "signature": p["signature"], "consent": p["consent"],
                                  "deposit": p["deposit"], "statements": []} for p in status["participants"]],
            }
    return instruments, participation


# ---------------------------------------------------------------- assembly

def main():
    result = countries_step()
    if not result:
        sys.exit("No se han podido cargar los nombres de países (M49).")
    countries, m49_ref = result
    resolve = Resolver(countries)

    un = un_step(resolve)
    tb = tb_step(resolve)
    oas = oas_step(resolve)
    au = au_step(resolve)
    texts_result = texts_step(oas[0] if oas else None, None)

    import assemble
    assemble.write_all(countries=countries, m49_ref=m49_ref, resolve=resolve, un=un, tb=tb, oas=oas, au=au, texts=texts_result, report=REPORT)

    import assemble_extra
    import src_bodies
    import src_caselaw
    import src_docs
    import sources
    gcs = step("Observaciones y recomendaciones generales")(lambda: src_caselaw.general_comments()[0])()
    tb_decisions = step("Decisiones de los órganos de tratados sobre España")(src_caselaw.treaty_body_decisions)()
    hudoc = step("HUDOC: sentencias del Tribunal Europeo relativas a España")(src_caselaw.hudoc_judgments)()
    for document_id in src_docs.PARAGRAPH_DOCUMENTS:
        document = step(f"Documento {document_id}")(src_docs.paragraph_document)(document_id)
        if document:
            write_json(DATA / "documents" / f"{document_id}.json", document)
    previous_bodies = {b["id"]: b for b in (read_json(DATA / "bodies.json", {}) or {}).get("bodies", [])}
    composition = {}
    for body_id, reader in (("coe-ecthr", src_bodies.ecthr), ("oas-iachr", src_bodies.iachr), ("au-achpr-commission", src_bodies.achpr)):
        result = step(f"Composición {body_id}")(reader)()
        composition[body_id] = result or (previous_bodies.get(body_id) or {}).get("members")
    afchpr = step("Corte Africana: declaraciones del artículo 34.6")(src_bodies.afchpr_declarations)()
    if afchpr is None:
        afchpr = ((read_json(DATA / "procedure-status.json", {}) or {}).get("afchpr_34_6"))
    errors = assemble_extra.write_extra(general_comments=gcs, tb_decisions=tb_decisions, hudoc=hudoc, composition=composition,
                                        oas_participation=oas[2] if oas else None, afchpr=afchpr, report=REPORT)
    sources.write_sources(REPORT)
    write_json(DATA / "report.json", {k: v for k, v in REPORT.items()})
    if errors:
        log(f"{len(errors)} referencias no verificadas:")
        for error in errors:
            log(f"  {error['where']}: {error['detail']}")


if __name__ == "__main__":
    main()
