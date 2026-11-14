"""Institutional interpretations and decisions.

- General comments and general recommendations of the UN treaty bodies (OHCHR treaty body database).
  A comment is linked to an article only when its official title names that article
  ("General comment No. 36 - Article 6 (the right to life)"): the title is kept as the evidence.
- Decisions of the treaty bodies on individual communications concerning a State (same database,
  document type "Jurisprudencia"). The database gives the symbol and the date; it does not give the
  articles examined or the outcome, so no relation to articles is made for them.
- Judgments of the European Court of Human Rights (HUDOC, the Court's database). HUDOC publishes, for
  each judgment, the articles found violated and not violated: those are the only relations made.
"""
from __future__ import annotations

import json
import re
from urllib.parse import quote

from common import fetch, one_line, source_ref
from src_tbdocs import GENERAL_COMMENTS, TREATY_IDS, download_url, search, undocs_url

COMMITTEE = {
    "CCPR": ("un-ccpr", "un-iccpr"), "CESCR": ("un-cescr", "un-icescr"), "CERD": ("un-cerd", "un-icerd"), "CEDAW": ("un-cedaw", "un-cedaw"),
    "CAT": ("un-cat", "un-cat"), "CAT-OP": ("un-spt", "un-opcat"), "CRC": ("un-crc", "un-crc"), "CMW": ("un-cmw", "un-cmw"),
    "CRPD": ("un-crpd", "un-crpd"), "CED": ("un-ced", "un-ced"),
}
JURISPRUDENCE = 17
SPAIN_TB_ID = 163

# "Article 6", "artículo 14", "articles 17 (7) and 18 (5)", "(art. 4)", "article 1, paragraph 1".
ARTICLE_MENTION = re.compile(r"\b(?:art(?:icles?|ículos?|\.)|art)\s*\.?\s*((?:\d+(?:\.\d+)?(?:\s*\(\d+\))?(?:\s*(?:,|and|y|et|&)\s*)?)+)", re.I)


def articles_named(title: str, protocol_committee: bool = False) -> list[str]:
    """Articles that the title names. A mention followed by "Protocol" refers to another
    instrument and is left out, unless the committee's own instrument is that protocol."""
    found = []
    for match in ARTICLE_MENTION.finditer(title or ""):
        after = (title or "")[match.end():match.end() + 40]
        if re.search(r"protocol", after, re.I) and not protocol_committee:
            continue
        for number in re.findall(r"(\d+)(?:\.\d+)?(?:\s*\(\d+\))?", match.group(1)):
            if number not in found and int(number) < 200:
                found.append(number)
    return found


def kind_of(title: str, committee: str) -> str:
    if re.search(r"recommendation|recomendaci", title, re.I):
        return "general_recommendation"
    return "general_comment"


def general_comments() -> tuple[list[dict], list[dict]]:
    records, refs = [], []
    for treaty_id, committee in TREATY_IDS.items():
        result = search(treaty_id, GENERAL_COMMENTS)
        refs.append(result["ref"])
        body, instrument = COMMITTEE[committee]
        for row in result["rows"]:
            symbol = row["symbol"]
            internal = symbol.startswith("INT/")
            base = "gc-" + re.sub(r"[^a-z0-9]+", "-", symbol.lower()).strip("-")
            # The database lists some documents more than once under one symbol (an easy-read or
            # plain-language version, a correction): each listing keeps its own record.
            taken = sum(1 for r in records if r["id"] == base or r["id"].startswith(base + "--"))
            records.append({
                "id": base if not taken else f"{base}--{taken + 1}",
                "type": kind_of(row["title"], committee),
                "symbol": symbol,
                "title": row["title"],
                "committee": committee,
                "body": body,
                "instrument": instrument,
                "date": row["date"],
                "joint": bool(re.search(r"\bjoint\b|conjunta", row["title"], re.I)),
                "links": {"es": download_url(symbol, "es"), "en": download_url(symbol, "en"),
                          **({"undocs_es": undocs_url(symbol, "es")} if not internal else {})},
                "version_note": "Versión de lectura fácil" if re.search(r"easy read", row["title"], re.I) else
                                "Versión en lenguaje sencillo" if re.search(r"plain english|plain language", row["title"], re.I) else None,
                "articles": [{"instrument": instrument, "article": n, "relation": "title_names_article", "evidence": row["title"]}
                             for n in articles_named(row["title"], committee == "CAT-OP")],
                "ref": result["ref"],
            })
    # The same document can be listed by two committees (joint recommendations): kept once per committee.
    return records, refs


def communication_number(symbol: str) -> str | None:
    match = re.search(r"/D/(\d+[A-Z]?/\d{4})", symbol)
    return match.group(1) if match else None


def treaty_body_decisions(country_tb_id: int = SPAIN_TB_ID, iso3: str = "ESP") -> list[dict]:
    records = []
    for treaty_id, committee in TREATY_IDS.items():
        result = search(treaty_id, JURISPRUDENCE, country_id=country_tb_id)
        body, instrument = COMMITTEE[committee]
        for row in result["rows"]:
            symbol = row["symbol"]
            records.append({
                "id": "tb-" + re.sub(r"[^a-z0-9]+", "-", symbol.lower()).strip("-"),
                "source": "tbinternet",
                "type": "treaty_body_decision",
                "symbol": symbol,
                "communication": communication_number(symbol),
                "title": row["title"] or None,
                "committee": committee,
                "body": body,
                "instrument": instrument,
                "states": [iso3],
                "date": row["date"],
                "links": {"es": download_url(symbol, "es"), "en": download_url(symbol, "en")},
                "articles": [],
                "ref": result["ref"],
            })
    return records


HUDOC = "https://hudoc.echr.coe.int/app/query/results"
FIELDS = "itemid,docname,appno,conclusion,kpdate,doctype,importance,ecli,respondent,article,violation,nonviolation,documentcollectionid2,judgementdate,languageisocode"


def _echr_article(code: str) -> tuple[str, str] | None:
    """HUDOC codes: '8', '8-1' (article 8, paragraph 1), 'P1-1' (Protocol No. 1, article 1),
    '14+8' (article 14 taken with article 8). Returns (instrument, article)."""
    code = code.strip()
    protocol = re.fullmatch(r"P(\d+)-(\d+)(?:-\d+)?", code)
    if protocol:
        return (f"coe-echr-p{protocol.group(1)}", protocol.group(2))
    plain = re.fullmatch(r"(\d+)(?:-\d+)?", code)
    if plain:
        return ("coe-echr", plain.group(1))
    return None


def hudoc_judgments(respondent: str = "ESP") -> list[dict]:
    query = f'contentsitename:ECHR AND respondent:{respondent} AND documentcollectionid2:"JUDGMENTS" AND languageisocode:ENG'
    records, start = [], 0
    while True:
        url = f"{HUDOC}?query={quote(query)}&select={FIELDS}&sort=kpdate%20Descending&start={start}&length=100"
        page = fetch(url, adapter="hudoc")
        data = json.loads(page.text())
        rows = data.get("results") or []
        for row in rows:
            c = row["columns"]
            relations = []
            for field, relation in (("violation", "violation"), ("nonviolation", "no_violation")):
                for code in filter(None, (c.get(field) or "").split(";")):
                    if "+" in code:
                        continue  # combined articles are kept in the official conclusion text
                    target = _echr_article(code)
                    if target and not any(r["instrument"] == target[0] and r["article"] == target[1] and r["relation"] == relation for r in relations):
                        relations.append({"instrument": target[0], "article": target[1], "relation": relation, "code": code,
                                          "evidence": c.get("conclusion")})
            records.append({
                "id": "echr-" + c["itemid"],
                "source": "hudoc",
                "type": "judgment",
                "itemid": c["itemid"],
                "title": one_line(c.get("docname")),
                "application": c.get("appno"),
                "ecli": c.get("ecli"),
                "body": "coe-ecthr",
                "instrument": "coe-echr",
                "states": [respondent],
                "date": (c.get("kpdate") or "")[:10] or None,
                "importance": c.get("importance"),
                "formation": next((x for x in (c.get("documentcollectionid2") or "").split(";") if x in ("GRANDCHAMBER", "CHAMBER", "COMMITTEE")), None),
                "conclusion": c.get("conclusion"),
                "articles_indexed": [x for x in (c.get("article") or "").split(";") if x],
                "articles": relations,
                "links": {"hudoc": f"https://hudoc.echr.coe.int/eng?i={c['itemid']}"},
                "ref": source_ref("hudoc", url, page),
            })
        start += len(rows)
        if not rows or start >= (data.get("resultcount") or 0):
            break
    return records
