"""Interpretations, decisions, bodies, procedures and rights: the files that link the library.

Run after assemble.write_all (it reads the texts and the participation matrix already written).
Every relation written here carries its basis: the quotation of the provision, the official title
that names the article, or the official metadata of the decision.
"""
from __future__ import annotations

import re

import curated
import quotes
from common import DATA, TODAY, fold, one_line, read_json, write_json


def article_index() -> dict[tuple[str, str], dict]:
    index = {}
    for path in (DATA / "texts").glob("*.json"):
        instrument, lang, _ = path.name.rsplit(".", 2)
        text = read_json(path)
        for node in text["nodes"]:
            if node["kind"] == "article":
                index.setdefault((instrument, node["number"]), {"anchor": node["id"], "heading": node.get("heading"), "lang": lang})
    return index


def resolve_all(refs: list, errors: list, where: str) -> list:
    out = []
    for ref in refs or []:
        resolved = quotes.resolve_doc(ref) if "doc" in ref else quotes.resolve(ref)
        if resolved.get("error"):
            errors.append({"where": where, "detail": resolved["error"]})
        out.append(resolved)
    return out


def labelled(pairs: list, errors: list, where: str) -> list:
    return [{"label": label, **resolve_all([ref], errors, where)[0]} for label, ref in pairs or []]


def write_extra(*, general_comments: list | None, tb_decisions: list | None, hudoc: list | None, composition: dict, oas_participation: dict | None,
                afchpr: dict | None, report: dict):
    errors: list = []
    index = article_index()
    instruments = {i["id"]: i for i in read_json(DATA / "instruments.json")["instruments"]}
    matrix = read_json(DATA / "matrix.json")["states"]
    acceptance = read_json(DATA / "acceptance.json")["countries"]

    # ---- Interpretations: general comments and general recommendations.
    previous = read_json(DATA / "interpretations.json", {}) or {}
    if general_comments is None:
        interpretations = previous.get("items", [])
    else:
        interpretations = []
        for record in general_comments:
            for relation in record["articles"]:
                target = index.get((relation["instrument"], relation["article"]))
                relation["anchor"] = target["anchor"] if target else None
                relation["in_reader"] = bool(target)
            interpretations.append(record)
    write_json(DATA / "interpretations.json", {"source": "tbinternet", "generated": TODAY, "items": interpretations})

    # ---- Decisions.
    previous = read_json(DATA / "decisions.json", {}) or {}
    kept_tb = [d for d in previous.get("items", []) if d.get("source") == "tbinternet"]
    kept_hudoc = [d for d in previous.get("items", []) if d.get("source") == "hudoc"]
    decisions = (tb_decisions if tb_decisions is not None else kept_tb) + (hudoc if hudoc is not None else kept_hudoc)
    for decision in decisions:
        for relation in decision.get("articles", []):
            target = index.get((relation["instrument"], relation["article"]))
            relation["anchor"] = target["anchor"] if target else None
    write_json(DATA / "decisions.json", {"generated": TODAY, "hudoc_status": "ok" if hudoc is not None else ("kept" if kept_hudoc else "unavailable"),
                                         "items": decisions})

    # ---- Bodies.
    bodies = []
    for body in curated.BODIES:
        record = {k: v for k, v in body.items() if k not in ("established_by", "composition", "competences", "established_by_doc")}
        if body.get("established_by"):
            record["established_by"] = resolve_all([body["established_by"]], errors, body["id"])[0]
        if body.get("established_by_doc"):
            record["established_by"] = resolve_all([body["established_by_doc"]], errors, body["id"])[0]
        record["composition"] = resolve_all(body.get("composition"), errors, body["id"])
        record["competences"] = labelled(body.get("competences"), errors, body["id"])
        record["members"] = composition.get(body["id"])
        record["interpretations"] = sum(1 for g in interpretations if g["body"] == body["id"])
        record["decisions"] = sum(1 for d in decisions if d["body"] == body["id"])
        bodies.append(record)
    write_json(DATA / "bodies.json", {"generated": TODAY, "bodies": bodies})

    # ---- Procedures and, for each State, whether the register shows it bound by them.
    oas_62 = {}
    if oas_participation:
        import src_bodies
        for p in oas_participation.get("oas-achr", {}).get("participants", []):
            if p.get("iso3"):
                found = src_bodies.oas_article_62([s["text"] for s in p.get("statements", [])])
                if found:
                    oas_62[p["iso3"]] = found
    au_346 = {}
    if afchpr:
        from src_countries import Resolver, load_m49
        countries, _ = load_m49()
        resolver = Resolver(countries)
        for row in afchpr["rows"]:
            iso3 = resolver(row["name"].replace("Guinea Bissau", "Guinea-Bissau").replace("Cote d’Ivoire", "Côte d'Ivoire"), "afchpr")
            if iso3:
                au_346[iso3] = row
    procedures, status = [], {}
    for proc in curated.PROCEDURES:
        record = {k: v for k, v in proc.items() if k not in ("basis", "who", "against", "requirements", "deadline", "interim", "steps", "follow_up")}
        for key in ("basis", "who", "against", "interim", "follow_up"):
            record[key] = resolve_all(proc.get(key), errors, proc["id"])
        for key in ("requirements", "deadline", "steps"):
            record[key] = labelled(proc.get(key), errors, proc["id"])
        refs = [r for k in ("basis", "who", "against", "interim", "follow_up") for r in record[k]] + \
               [r for k in ("requirements", "deadline", "steps") for r in record[k]]
        record["quoted"] = sum(1 for r in refs if r.get("quote"))
        record["unquoted"] = sum(1 for r in refs if not r.get("quote"))
        procedures.append(record)
        status[proc["id"]] = acceptance_of(proc["acceptance"], matrix, acceptance, oas_62, au_346, instruments)
    write_json(DATA / "procedures.json", {"generated": TODAY, "procedures": procedures})
    write_json(DATA / "procedure-status.json", {"generated": TODAY,
                                                "note": "Estado de cada procedimiento por país según los registros oficiales; «check» significa que el dato debe comprobarse en la fuente.",
                                                "oas_article_62": oas_62, "afchpr_34_6": afchpr, "procedures": status})

    # ---- Rights explorer.
    rights = []
    texts_meta = {}
    for path in (DATA / "texts").glob("*.json"):
        instrument, lang, _ = path.name.rsplit(".", 2)
        texts_meta.setdefault(instrument, read_json(path))
    for right in curated.RIGHTS:
        phrases = [fold(x) for x in right["phrases"]]
        exact = [fold(x) for x in right.get("exact", [])]
        links, seen = [], set()
        for instrument, text in texts_meta.items():
            if instruments.get(instrument, {}).get("category") == "procedural":
                continue
            for node in text["nodes"]:
                heading = node.get("heading") if node["kind"] == "article" else None
                # An article that sets up a body ("Comité sobre los Derechos de las Personas con
                # Discapacidad") names a right in its heading without recognising it.
                body_article = heading and re.search(r"\b(Comit[ée]|Comisi[óo]n|Grupo de Expertos|Committee|Commission|GREVIO|GRETA)\b", heading)
                if heading and not body_article and (any(p in fold(heading) for p in phrases) or fold(heading).strip(" .") in exact):
                    key = (instrument, node["number"])
                    if key not in seen:
                        seen.add(key)
                        links.append({"instrument": instrument, "article": node["number"], "anchor": node["id"], "basis": "article_heading",
                                      "evidence": heading, "lang": text["lang"]})
        for g in interpretations:
            if any(p in fold(g["title"]) for p in phrases) and g["articles"]:
                for relation in g["articles"]:
                    key = (relation["instrument"], relation["article"])
                    links.append({"instrument": relation["instrument"], "article": relation["article"], "anchor": relation.get("anchor"),
                                  "basis": "general_comment_title", "evidence": g["title"], "document": g["id"], "symbol": g["symbol"]})
                    seen.add(key)
        whole = []
        for instrument_id, record in instruments.items():
            title = " ".join(filter(None, [record.get("title_es"), record.get("title_en")]))
            if record.get("category") != "procedural" and title and any(p in fold(title) for p in phrases):
                whole.append({"instrument": instrument_id, "basis": "instrument_title", "evidence": record.get("title_es") or record.get("title_en")})
        comments = [g["id"] for g in interpretations if any(p in fold(g["title"]) for p in phrases)]
        rights.append({"id": right["id"], "name": right["name"], "phrases": right["phrases"], "articles": links, "instruments": whole,
                       "interpretations": comments})
    write_json(DATA / "rights.json", {"generated": TODAY, "rights": rights})

    report["quote_errors"] = errors
    return errors


def acceptance_of(rule: dict, matrix: dict, acceptance: dict, oas_62: dict, au_346: dict, instruments: dict) -> dict:
    """{iso3: {"s": accepted|not_accepted|withdrawn|not_recorded|check, "why": text, "d": date}} for every
    State in the matrix. Only what a register states is used; anything else is "check"."""
    out = {}
    for iso3, row in matrix.items():
        result = None
        if "tb" in rule:
            entries = [p for p in (acceptance.get(iso3) or {}).get("procedures", []) if p["code"] == rule["tb"]]
            if entries:
                entry = entries[0]
                if entry["accepted"] is True:
                    result = {"s": "accepted", "why": "Aceptado según la base de datos de órganos de tratados del ACNUDH", "d": entry["date"]}
                elif entry["accepted"] is False:
                    result = {"s": "not_accepted", "why": "No aceptado según la base de datos de órganos de tratados del ACNUDH"}
                else:
                    result = {"s": "check", "why": f"La base de datos del ACNUDH indica «{entry['raw'] or 'sin dato'}»"}
        if "tb_kind" in rule:
            entries = [p for p in (acceptance.get(iso3) or {}).get("procedures", []) if p["kind"] == rule["tb_kind"] and p["accepted"] is True]
            result = {"s": "accepted" if entries else "check", "why": ("Aceptado para: " + ", ".join(e["code"] for e in entries)) if entries else
                      "Ningún procedimiento de este tipo figura como aceptado en la base de datos del ACNUDH; compruébese en la fuente"}
        if "party" in rule and (result is None or result["s"] == "check"):
            cell = row.get(rule["party"])
            if cell and cell["s"] in ("consent", "consent_boe"):
                party = {"s": "accepted", "why": "Consta su consentimiento en obligarse por el instrumento", "d": cell.get("d")}
                result = party if result is None else {**party, "s": "check", "why": result["why"] + "; " + party["why"]}
            elif cell and cell["s"] in ("denounced", "bracketed"):
                result = {"s": "check", "why": "El registro recoge una denuncia o una entrada entre corchetes; véanse las notas del depositario"}
            elif cell and cell["s"] == "signature":
                result = result or {"s": "not_accepted", "why": "Solo consta la firma; no consta la ratificación o adhesión"}
            elif result is None:
                system = instruments.get(rule["party"], {}).get("system")
                result = {"s": "not_recorded" if system in ("un", "oas", "au") else "check",
                          "why": "Sin actuación registrada en el registro del depositario" if system in ("un", "oas", "au") else
                          "La Oficina de Tratados del Consejo de Europa no es accesible de forma automatizada; compruébese en la fuente"}
        if "party_any" in rule:
            hits = [i for i in rule["party_any"] if (row.get(i) or {}).get("s") in ("consent", "consent_boe")]
            result = {"s": "accepted" if hits else "not_recorded", "why": f"Estado Parte en {len(hits)} de los tratados" if hits else "Sin consentimiento registrado"}
        if "declaration" in rule:
            if rule["declaration"] == "oas-62":
                found = oas_62.get(iso3)
                if found and not found["denunciation_mentioned"]:
                    result = {"s": "accepted", "why": "Declaración localizada en el registro de la OEA (véase la cita)", "quote": found["quote"]}
                elif found:
                    result = {"s": "check", "why": "Consta una declaración (art. 62) y el registro menciona también una denuncia", "quote": found["quote"]}
                elif (row.get("oas-achr") or {}).get("s") == "consent":
                    result = {"s": "check", "why": "Estado Parte en la Convención; no se ha localizado la declaración del art. 62 en el registro"}
                else:
                    result = {"s": "not_recorded", "why": "No es Parte en la Convención Americana según el registro de la OEA"}
            if rule["declaration"] == "au-34-6":
                found = au_346.get(iso3)
                if found and found.get("withdrawal"):
                    result = {"s": "withdrawn", "why": "Declaración retirada según la lista de la Corte Africana", "d": found["withdrawal"]}
                elif found:
                    result = {"s": "accepted", "why": "Declaración del art. 34.6 según la lista de la Corte Africana", "d": found.get("deposit")}
                elif (row.get("au-court-protocol") or {}).get("s") == "consent":
                    result = {"s": "not_accepted", "why": "Parte en el Protocolo; no figura en la lista de declaraciones del art. 34.6"}
                else:
                    result = {"s": "not_recorded", "why": "No es Parte en el Protocolo de la Corte según la lista de la Unión Africana"}
        if "member" in rule and result is None:
            if rule["member"] == "oas":
                cell = row.get("oas-charter")
                result = ({"s": "accepted", "why": "Ha ratificado la Carta de la OEA según el registro de la OEA", "d": cell.get("d")}
                          if cell and cell["s"] == "consent" else {"s": "check", "why": "No consta la ratificación de la Carta de la OEA en el registro"})
            else:
                result = {"s": "check", "why": "Se aplica a los Estados Miembros de la organización (dato no incorporado al Atlas)"}
        if result:
            out[iso3] = result
    return out
