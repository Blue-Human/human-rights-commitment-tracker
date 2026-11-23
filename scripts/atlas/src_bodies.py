"""Composition of the bodies and acceptance of their competence, from their own sites.

- European Court of Human Rights: "Composition of the Court" (judges in order of precedence, with
  their function and the State in respect of which they were elected).
- Inter-American Commission: "Composición" (members, term of office, officers).
- African Commission: "Commissioners" (members, function, country).
- African Court: "Declarations" (States that made the declaration of article 34(6) of its Protocol,
  with the withdrawals).
- Inter-American Court: recognitions of its jurisdiction (article 62 of the American Convention), as
  they appear in the declarations the OAS register publishes under each State.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from common import en_date, fetch, one_line, source_ref
from src_oas import _decode

ECTHR = "https://www.echr.coe.int/composition-of-the-court"
IACHR = "https://www.oas.org/es/cidh/mandato/composicion.asp"
ACHPR = "https://achpr.au.int/en/commission/commissioners"
AFCHPR_DECLARATIONS = "https://www.african-court.org/afchpr/declarations-2/"


def ecthr() -> dict:
    page = fetch(ECTHR, adapter="echr")
    soup = BeautifulSoup(page.text(), "html.parser")
    as_at = re.search(r"In order of precedence as at (\d{2})/(\d{2})/(\d{4})", soup.get_text(" "))
    members = []
    for row in soup.select(".horizontal-list"):
        cells = [one_line(c.get_text(" ")) for c in row.select("[class^=list-item]")]
        if len(cells) >= 3 and cells[0]:
            members.append({"name": cells[0], "state": cells[1], "function": cells[2]})
    return {"as_at": f"{as_at.group(3)}-{as_at.group(2)}-{as_at.group(1)}" if as_at else None, "members": members,
            "ref": source_ref("echr", ECTHR, page)}


def iachr() -> dict:
    page = fetch(IACHR, adapter="oas")
    soup = BeautifulSoup(_decode(page.body), "html.parser")
    for junk in soup(["script", "style"]):
        junk.decompose()
    text = one_line(soup.get_text(" | "))
    block = text[text.find("Composición de la CIDH"):]
    members = []
    for name, start, end in re.findall(r"\|\s*([A-ZÁÉÍÓÚÑ][^|]{3,60}?)\s*\|[\s|]*(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})", block[:3000]):
        d = lambda v: f"{v[6:10]}-{v[3:5]}-{v[0:2]}"
        members.append({"name": one_line(name), "term_start": d(start), "term_end": d(end)})
    officers = []
    for role, name in re.findall(r"(President[ae]|Primer[oa]? vicepresident[ae]|Segund[oa] vicepresident[ae])\s*:\s*\|\s*([^|]+)", block[:4000]):
        officers.append({"function": role, "name": one_line(name)})
    return {"as_at": page.fetched_at[:10], "members": members, "officers": officers, "ref": source_ref("oas", IACHR, page)}


def achpr() -> dict:
    page = fetch(ACHPR, adapter="achpr")
    soup = BeautifulSoup(page.text(), "html.parser")
    for junk in soup(["script", "style", "nav", "header", "footer"]):
        junk.decompose()
    main = soup.find("main") or soup.body
    text = one_line(main.get_text(" "))
    members = []
    for name, function, country in re.findall(r"Hon\. ([A-ZÀ-Ý][^:]+?) (Chairperson|Vice-Chairperson|Commissioner) ([A-Z][A-Za-z' .-]+?) Flag", text):
        members.append({"name": one_line(name), "function": function, "state": one_line(country)})
    return {"as_at": page.fetched_at[:10], "members": members, "ref": source_ref("achpr", ACHPR, page)}


def afchpr_declarations() -> dict:
    page = fetch(AFCHPR_DECLARATIONS, adapter="au", timeout=40)
    soup = BeautifulSoup(page.text(), "html.parser")
    content = soup.select_one(".entry-content") or soup.body
    # The table is laid out with blocks, not rows: each State reads
    # "Burkina Faso 14 Jul 1998 28 Jul 1998 Download ❌" or "... Download 14 Nov 2019 Download".
    text = one_line(content.get_text(" "))
    links = [a["href"] for a in content.find_all("a", href=True) if a["href"].lower().endswith(".pdf")]
    date = r"\d{1,2} [A-Z][a-z]{2,4} \d{4}"
    rows = []
    for match in re.finditer(rf"([A-Z][A-Za-z’'éô -]+?) ({date}) ({date}) Download (❌|({date}) Download)", text):
        rows.append({"name": re.sub(r"^.*Withdrawals\s+", "", one_line(match.group(1))), "ratification": en_date(match.group(2).replace("Sept", "Sep")),
                     "deposit": en_date(match.group(3).replace("Sept", "Sep")),
                     "withdrawal": en_date(match.group(5).replace("Sept", "Sep")) if match.group(5) else None,
                     "columns": "Country | Ratification | Deposition | Declaration | Withdrawals"})
    for row in rows:
        key = re.sub(r"[^a-z]", "", row["name"].lower())[:6]
        row["documents"] = [u for u in links if key and key in re.sub(r"[^a-z]", "", u.lower())]
    quote = None
    match = re.search(r"Article 34 of the Protocol stipulates that (“[^”]+”)", content.get_text(" "))
    if match:
        quote = one_line(match.group(1))
    return {"rows": rows, "article_34_6": quote, "ref": source_ref("au", AFCHPR_DECLARATIONS, page)}


def oas_article_62(statements: list[str]) -> dict | None:
    """The sentence of a State's declarations in the OAS register that recognises the Court's
    jurisdiction under article 62, and whether the register also mentions a denunciation."""
    text = " ".join(statements)
    for sentence in re.split(r"(?<=[.;])\s+", text):
        names_court = re.search(r"competencia de la Corte", sentence, re.I)
        recognises = re.search(r"\b(reconoce|acepta|declara)\b", sentence, re.I) and not re.search(r"\bno (reconoce|acepta)\b", sentence, re.I)
        about_cases = re.search(r"art[íi]culo\s+62|62 de la Convenci|obligatori|interpretaci[óo]n o aplicaci[óo]n", sentence, re.I)
        if names_court and recognises and about_cases:
            return {"quote": one_line(sentence)[:900], "denunciation_mentioned": bool(re.search(r"denunci", text, re.I))}
    return None
