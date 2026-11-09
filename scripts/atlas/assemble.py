"""Merge what the adapters read into the files the site serves (data/atlas).

Nothing here adds legal content: it joins records by their identifiers (instrument id, ISO code),
copies titles and dates from the source that publishes them, and records where each value comes
from. Status labels are the register's own categories (see STATUS in src/lib/atlas/labels.ts).
"""
from __future__ import annotations

import re

import src_boe
import src_oas
import src_texts
from build import TB_ACRONYMS, TB_PROCEDURES
from catalog import AU, COE, OAS, UN_CORE
from common import DATA, TODAY, fetch_log, fold, one_line, read_json, source_ref, write_json, ES_MONTH_NAMES

TITLE_PREFIX = re.compile(
    r"^(?:Instrumento\s+(?:de|De)\s+(?:[Rr]atificaci[óo]n|[Aa]dhesi[óo]n|[Aa]ceptaci[óo]n)(?:,?\s+de\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4},?)?"
    r"(?:\s+(?:de|por parte de)\s+España)?\s+(?:del|de la|de los|al|a la|de)\s+|Adhesión de España (?:al|a la)\s+)", re.I)
TITLE_SUFFIX = re.compile(r",?\s+(?:hech[oa]|adoptad[oa]|aprobad[oa]|abiert[oa])\s+.*$", re.I)


def boe_title(title: str | None) -> str | None:
    """'Instrumento de Ratificación de España del Pacto Internacional de Derechos Civiles y
    Políticos, hecho en Nueva York el 19 de diciembre de 1966.' → 'Pacto Internacional de Derechos
    Civiles y Políticos'. Only the frame added by the BOE is removed."""
    if not title:
        return None
    name = TITLE_PREFIX.sub("", one_line(title))
    name = TITLE_SUFFIX.sub("", name).strip(" .")
    name = re.sub(r"\s*\((?:número|n\.?\s?º|nº|Convenio nº)\s*\d+\s+del Consejo de Europa\)", "", name, flags=re.I)
    return name[0].upper() + name[1:] if name else None


def boe_done(title: str | None) -> str | None:
    """'hecho en Nueva York el 19 de diciembre de 1966' as printed in the BOE title."""
    match = re.search(r"(hech[oa]|adoptad[oa]|aprobad[oa])\s+(en|por)\s+(.+?)(?:,\s*y\s+enmendad[oa].*|\.\s*$|$)", one_line(title or ""))
    return f"{match.group(1)} {match.group(2)} {match.group(3)}".strip(" .") if match else None


def es_date(text: str | None) -> str | None:
    match = re.search(r"(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", (text or "").lower())
    if not match or match.group(2) not in ES_MONTH_NAMES:
        return None
    return f"{match.group(3)}-{ES_MONTH_NAMES[match.group(2)]:02d}-{int(match.group(1)):02d}"


def council_number(title: str | None) -> str | None:
    match = re.search(r"\((?:número|n\.?\s?º|nº|Convenio nº)\s*(\d+)\s+del Consejo de Europa\)", title or "", re.I)
    return match.group(1) if match else None


def spain_from_boe(text: dict | None, boe_meta_title: str | None) -> dict | None:
    """What the BOE itself states about Spain: the kind of instrument (from its title) and the date
    of entry into force for Spain (from the BOE's note), each with the sentence it comes from."""
    if not text:
        return None
    kind = None
    match = re.match(r"^Instrumento\s+(?:de|De)\s+(Ratificaci[óo]n|ratificaci[óo]n|Adhesi[óo]n|adhesi[óo]n|Aceptaci[óo]n|aceptaci[óo]n)", boe_meta_title or "")
    if match:
        kind = {"ratificacion": "ratification", "adhesion": "accession", "aceptacion": "acceptance"}[fold(match.group(1))]
    note = next((n for n in text.get("publication_notes", []) if re.search(r"para España", n or "") and re.search(r"vigor", n or "")), None)
    in_force = None
    if note:
        part = re.search(r"para España(?:\s+entr[óoa]+r?[áa]?\s+en\s+vigor)?\s+el\s+(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})", note)
        in_force = es_date(part.group(1)) if part else None
    general = None
    if note:
        part = re.search(r"de forma general(?:\s+y\s+para España)?\s+el\s+(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})", note)
        general = es_date(part.group(1)) if part else None
        if re.search(r"de forma general y para España el", note) and in_force is None:
            in_force = general
    return {"instrument_type": kind, "entry_into_force": in_force, "general_entry_into_force": general, "note": note,
            "boe": text["source"]["identifier"], "url": text["source"]["url"]}


def boe_instrument(boe_id: str) -> dict:
    """Title and closing notes of a BOE gazette publication."""
    doc = src_boe.gazette(boe_id)
    paragraphs = [p.get("text") for p in doc["paragraphs"] if p.get("text")]
    return {"title": doc["meta"].get("titulo"), "notes": [p for p in paragraphs if re.search(r"para España", p) and re.search(r"vigor", p)]}


def write_all(*, countries, m49_ref, resolve, un, tb, oas, au, texts, report):
    previous_instruments = {i["id"]: i for i in (read_json(DATA / "instruments.json", {}) or {}).get("instruments", [])}
    instruments: dict[str, dict] = {}
    participation: dict[str, dict] = {}
    if un:
        instruments.update(un[0])
        participation.update(un[1])
    if oas:
        instruments.update(oas[1])
        participation.update(oas[2])
    if au:
        instruments.update(au[0])
        participation.update(au[1])
    text_results, pending = texts or ({}, [])

    # Instruments whose register could not be read this time keep their previous record.
    for instrument_id, record in previous_instruments.items():
        if instrument_id not in instruments and record.get("system") in ("un", "oas", "au"):
            instruments[instrument_id] = record
            previous = read_json(DATA / "participation" / f"{instrument_id}.json")
            if previous:
                participation[instrument_id] = previous

    # The Universal Declaration and the American Declaration are not treaties: no register.
    instruments["un-udhr"] = {"id": "un-udhr", "system": "un", "kind": "declaration", "category": "core", "parent": None,
                              "title_en": "Universal Declaration of Human Rights", "bodies": [], "registry": {}, "status": None}
    instruments["oas-american-declaration"] = {"id": "oas-american-declaration", "system": "oas", "kind": "declaration", "category": "regional",
                                               "parent": None, "bodies": ["oas-iachr"], "registry": {}, "status": None}
    for instrument_id, kind, parent, bodies in COE:
        instruments[instrument_id] = {"id": instrument_id, "system": "coe", "kind": kind, "category": "regional", "parent": parent,
                                      "bodies": bodies, "registry": {}, "status": None}
    for number in ("p1", "p4", "p6", "p7", "p12", "p13", "p16"):
        instruments[f"coe-echr-{number}"] = {"id": f"coe-echr-{number}", "system": "coe", "kind": "protocol", "category": "regional",
                                             "parent": "coe-echr", "bodies": ["coe-ecthr"], "registry": {}, "status": None}

    # Procedural documents: rules of procedure and statutes of the bodies.
    import src_docs
    for instrument_id, (symbol, lang, body, title, kind) in src_docs.DOCUMENTS.items():
        instruments[instrument_id] = {"id": instrument_id, "system": "un", "kind": kind, "category": "procedural", "parent": None,
                                      "bodies": [body], "title_es": title if title != "Reglamento" else None, "registry": {"un_symbol": symbol,
                                      "undocs_url": src_docs.UNDOCS.format(symbol=symbol, lang=lang)}, "status": None}
    for instrument_id, (url, body, _, title, _) in src_docs.HTML_DOCUMENTS.items():
        instruments[instrument_id] = {"id": instrument_id, "system": "oas", "kind": "rules" if "rules" in instrument_id else "statute",
                                      "category": "procedural", "parent": None, "bodies": [body], "title_es": title,
                                      "registry": {"url": url}, "status": None}
    for instrument_id, (url, lang, body, title, kind, _) in src_docs.PDF_DOCUMENTS.items():
        if instrument_id == "au-court-protocol-text":
            continue
        instruments[instrument_id] = {"id": instrument_id, "system": "au", "kind": kind, "category": "procedural", "parent": None,
                                      "bodies": [body], "title_en": title, "title_es": None, "registry": {"url": url}, "status": None}

    # ---- Texts, titles in Spanish and what the BOE says about Spain.
    tb_names = {}
    for country in (tb or {}).values():
        for acronym, row in country.get("treaties", {}).items():
            tb_names.setdefault(acronym, row.get("name_es"))
    acronym_of = {v: k for k, v in TB_ACRONYMS.items()}
    for instrument_id, _, _, _ in UN_CORE:
        acronym = next((a for a, i in TB_ACRONYMS.items() if i == instrument_id), None)
        if acronym:
            instruments[instrument_id].setdefault("registry", {})["ohchr_tb"] = acronym

    for instrument_id, record in instruments.items():
        record["texts"] = []
        for lang in ("es", "en", "fr"):
            text = text_results.get((instrument_id, lang))
            if not text:
                continue
            quality = text["quality"]
            entry = {"lang": lang, "authority": text["authority"], "complete": quality["complete"], "publisher": text["source"]["publisher"],
                     "url": text["source"]["url"], "identifier": text["source"].get("identifier"), "method": text["source"].get("method"),
                     "articles": quality["articles"], "checks": quality["checks"]}
            if text.get("pending_review"):
                entry["pending_review"] = text["pending_review"]
            record["texts"].append(entry)
            path = DATA / "texts" / f"{instrument_id}.{lang}.json"
            if quality["complete"]:
                write_json(path, text)
            elif path.exists():
                # A text that no longer passes the checks is withdrawn from the reader.
                path.unlink()

        boe = src_texts.BOE_TEXTS.get(instrument_id)
        es_text = text_results.get((instrument_id, "es"))
        own = src_texts.SPAIN_INSTRUMENT.get(instrument_id)
        if own:
            info = boe_instrument(own)
            record["registry"]["boe"] = own
            if boe and boe[0] != own:
                record["registry"]["boe_text"] = boe[0]
            title_es = boe_title(info["title"])
            if instrument_id == "un-refugees-1951":
                title_es = "Convención sobre el Estatuto de los Refugiados"
            if instrument_id == "un-refugees-1967":
                title_es = "Protocolo sobre el Estatuto de los Refugiados"
            record["title_es"] = title_es
            record["title_es_source"] = own
            record["done_es"] = boe_done(info["title"]) if not instrument_id.startswith("un-refugees") else None
            record["council_number"] = council_number(info["title"])
            spain = spain_from_boe({"publication_notes": info["notes"], "source": {"identifier": own, "url": src_boe.human_url(own)}}, info["title"])
            if spain and (spain["instrument_type"] or spain["entry_into_force"]):
                record["spain_boe"] = spain
        elif boe and es_text:
            meta_title = es_text["source"].get("document")
            record["registry"]["boe"] = boe[0]
            record["title_es"] = boe_title(meta_title)
            record["title_es_source"] = boe[0]
            record["done_es"] = boe_done(meta_title)
            record["council_number"] = council_number(meta_title)
            spain = spain_from_boe(es_text, meta_title)
            if spain and (spain["instrument_type"] or spain["entry_into_force"]):
                record["spain_boe"] = spain
        if instrument_id.startswith("un-") and not record.get("title_es"):
            acronym = record.get("registry", {}).get("ohchr_tb")
            if acronym and tb_names.get(acronym):
                record["title_es"] = tb_names[acronym]
                record["title_es_note"] = "Nombre en español de la base de datos de órganos de tratados del ACNUDH."
        record.setdefault("title_es", None)

    # Declarations
    udhr = text_results.get(("un-udhr", "es"))
    instruments["un-udhr"]["title_es"] = "Declaración Universal de Derechos Humanos"
    instruments["un-udhr"]["title_es_note"] = "Título de la página oficial de las Naciones Unidas (un.org/es)."
    instruments["oas-american-declaration"]["title_es"] = "Declaración Americana de los Derechos y Deberes del Hombre"
    instruments["oas-american-declaration"]["title_es_note"] = "Título publicado por la Comisión Interamericana de Derechos Humanos (oas.org/es/cidh)."

    # OAS titles: as the Inter-American Commission lists them among its basic documents. A label
    # that opens with the popular name ("«Protocolo de San Salvador»: Protocolo Adicional...")
    # gives both.
    try:
        titles, titles_ref = src_oas.basic_titles()
    except Exception as error:
        titles, titles_ref = {}, None
        report["errors"].append({"step": "títulos OEA", "detail": str(error)})
    for instrument_id, code, *_ in OAS:
        record = instruments.get(instrument_id)
        if not record:
            continue
        label = titles.get(code)
        if label:
            popular = re.match(r'^"([^"]+)"\s*:\s*(.+)$', label)
            record["title_es"] = popular.group(2).strip() if popular else label
            if popular:
                record["popular_name_es"] = popular.group(1).strip()
            record["title_es_note"] = "Título en la página de documentos básicos de la Comisión Interamericana de Derechos Humanos."
            record["title_es_ref"] = titles_ref
        try:
            final_url, _, _ = src_oas.text_page(record["registry"]["oas_text_url"])
            record["registry"]["oas_text_url"] = final_url
        except Exception:
            pass

    # ---- Per-State dates and accepted procedures from the treaty body database.
    acceptance = {}
    if tb:
        for country in tb.values():
            iso3 = country["iso3"]
            if not iso3:
                continue
            for acronym, row in country["treaties"].items():
                instrument_id = TB_ACRONYMS.get(acronym)
                if not instrument_id or instrument_id not in participation:
                    continue
                for p in participation[instrument_id]["participants"]:
                    if p.get("iso3") == iso3:
                        p["ohchr"] = {"entry_into_force": row["entry_into_force"], "denunciation": row["denunciation"],
                                      "consent": row["consent"], "consent_code": row["consent_code"], "ref": country["ref"]}
            for proc in country["procedures"]:
                target = TB_PROCEDURES.get(proc["code"])
                acceptance.setdefault(iso3, []).append({
                    "kind": proc["kind"], "code": proc["code"], "name_es": proc["name_es"],
                    "instrument": target[0] if target else None, "article": target[1] if target else None,
                    "accepted": {"Si": True, "Sí": True, "No": False}.get(proc["accepted"] or "", None),
                    "raw": proc["accepted"], "date": proc["date"],
                })
            if iso3 in acceptance:
                acceptance[iso3] = {"ref": country["ref"], "procedures": acceptance[iso3]} if isinstance(acceptance[iso3], list) else acceptance[iso3]

    # ---- Status of each participant, in the register's own terms.
    def status_of(p: dict, system: str) -> dict:
        consent = p.get("consent")
        denunciation = (p.get("ohchr") or {}).get("denunciation")
        if consent and consent.get("bracketed"):
            return {"code": "bracketed", "date": consent.get("date"), "type": consent.get("type")}
        if denunciation:
            return {"code": "denounced", "date": denunciation, "type": consent.get("type") if consent else None}
        if consent:
            return {"code": "consent", "date": consent.get("date"), "type": consent.get("type")}
        if p.get("signature"):
            return {"code": "signature", "date": p.get("signature"), "type": None}
        return {"code": "listed", "date": None, "type": None}

    matrix: dict[str, dict] = {}
    for instrument_id, record in participation.items():
        system = instruments.get(instrument_id, {}).get("system")
        for p in record["participants"]:
            if p.get("listed") is False:
                continue
            status = status_of(p, system)
            p["status"] = status
            key = p.get("iso3") or f"register:{fold(p['name'])}"
            row = {"s": status["code"], "d": status["date"], "t": status["type"]}
            eif = (p.get("ohchr") or {}).get("entry_into_force")
            if eif:
                row["eif"] = eif
            reservations = sum(1 for s in p.get("statements", []) if s["kind"] in ("reservation", "reservation_and_declaration"))
            declarations = sum(1 for s in p.get("statements", []) if s["kind"] in ("declaration", "competence_declaration"))
            if reservations:
                row["r"] = reservations
            if declarations:
                row["dc"] = declarations
            matrix.setdefault(key, {})[instrument_id] = row

    # For the Council of Europe conventions (no register available), the general entry into force
    # comes from the BOE's note, with the sentence quoted.
    for record in instruments.values():
        spain = record.get("spain_boe") or {}
        if record["system"] == "coe" and spain.get("general_entry_into_force") and not (record.get("entry_into_force") or {}).get("date"):
            record["entry_into_force"] = {"date": spain["general_entry_into_force"], "text": spain["note"],
                                          "ref": {"source": "boe", "url": spain["url"], "identifier": spain["boe"]}}

    # Spain in the Council of Europe conventions, as the BOE states it.
    for instrument_id, record in instruments.items():
        if record["system"] == "coe" and record.get("spain_boe"):
            spain = record["spain_boe"]
            matrix.setdefault("ESP", {})[instrument_id] = {"s": "consent_boe", "d": None, "t": spain["instrument_type"], "eif": spain["entry_into_force"]}

    # ---- Countries: those that appear in a register, with their official names.
    by_iso = {c["iso3"]: c for c in countries}
    listed = sorted(k for k in matrix if not k.startswith("register:"))
    country_rows = []
    for iso3 in listed:
        c = by_iso.get(iso3)
        if not c:
            continue
        systems = sorted({instruments[i]["system"] for i in matrix[iso3] if i in instruments})
        country_rows.append({**c, "systems": systems})
    register_only = sorted({(p["name"], instrument_id) for instrument_id, r in participation.items() for p in r["participants"] if not p.get("iso3")})

    # ---- Children and parents.
    for record in instruments.values():
        record["children"] = sorted(i for i, r in instruments.items() if r.get("parent") == record["id"])

    order = {"un": 0, "coe": 1, "oas": 2, "au": 3}
    kinds = {"declaration": 0, "treaty": 1, "optional_protocol": 2, "protocol": 2, "amendment": 3}
    ids = [i for i, *_ in UN_CORE]
    def sort_key(record):
        position = ids.index(record["id"]) if record["id"] in ids else 99
        return (order.get(record["system"], 9), record.get("category") != "core", position, kinds.get(record["kind"], 9), record["id"])

    instrument_list = sorted(instruments.values(), key=sort_key)
    write_json(DATA / "instruments.json", {"generated": TODAY, "instruments": instrument_list})
    for instrument_id, record in participation.items():
        write_json(DATA / "participation" / f"{instrument_id}.json", record)
    write_json(DATA / "acceptance.json", {"source": "tbinternet", "countries": acceptance})
    write_json(DATA / "matrix.json", {"generated": TODAY, "states": {k: v for k, v in matrix.items() if not k.startswith("register:")},
                                      "register_only": [{"name": n, "instrument": i} for n, i in register_only]})
    write_json(DATA / "countries.json", {"source": m49_ref, "countries": country_rows})
    write_json(DATA / "pending-changes.json", pending)

    unmatched = {k: sorted(v) for k, v in resolve.unmatched.items()}
    report["unmatched_names"] = unmatched
    log = fetch_log()
    report["fetches"] = {"total": len(log), "network": sum(1 for f in log if not f.get("cached")),
                         "changed": sum(1 for f in log if f.get("changed"))}
    write_json(DATA / "report.json", {k: v for k, v in report.items() if k != "trace"})
    by_url = {}
    for f in log:
        by_url[f["url"]] = {k: f[k] for k in ("url", "adapter", "sha256", "bytes", "fetched_at") if k in f}
    write_json(DATA / "fetches.json", sorted(by_url.values(), key=lambda f: (f.get("adapter") or "", f["url"])))
