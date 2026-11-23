"""African Union (au.int) and the African Commission on Human and Peoples' Rights (achpr.au.int).

The AU treaty page gives the dates of adoption, last signature and entry into force, the treaty texts
and a PDF "status list" of the countries that have signed and ratified or acceded, dated by the AU.
The status lists do not distinguish ratification from accession: the column is
"ratification/accession", and the Atlas keeps that wording.
"""
from __future__ import annotations

import re

import pymupdf
from bs4 import BeautifulSoup

from catalog import AU
from common import fetch, one_line, source_ref

BASE = "https://au.int"


def _date(value: str) -> str | None:
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", value.strip())
    return f"{match.group(3)}-{int(match.group(2)):02d}-{int(match.group(1)):02d}" if match else None


def _page_date(text: str) -> tuple[str | None, str | None]:
    """'Mon, 1 Jun 1981 - 11:00' → ('1981-06-01', precision). The AU records several adoption dates
    on the first day of the month; those are kept to the month, since the day is not given."""
    match = re.search(r"(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})", text or "")
    if not match:
        return None, None
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    month = months.index(match.group(2)) + 1
    day = int(match.group(1))
    if day == 1:
        return f"{match.group(3)}-{month:02d}", "month"
    return f"{match.group(3)}-{month:02d}-{day:02d}", "day"


def treaty(slug: str) -> dict:
    url = f"{BASE}/en/treaties/{slug}"
    page = fetch(url, adapter="au")
    soup = BeautifulSoup(page.text(), "html.parser")
    text = one_line(soup.get_text(" "))
    fields = {}
    for key, label in (("adopted", "Date of Adoption"), ("last_signature", "Date of last signature"), ("entry_into_force", "Date entry into force")):
        match = re.search(re.escape(label) + r"\s+(\w{3}, \d{1,2} \w{3} \d{4})", text)
        fields[key] = _page_date(match.group(1)) if match else (None, None)
    links = {a.get_text(" ").strip(): a["href"] for a in soup.find_all("a", href=True) if a["href"].lower().endswith(".pdf")}
    status_list = next((BASE + h if h.startswith("/") else h for t, h in links.items() if "-sl-" in h.lower()), None)
    texts = {t: (BASE + h if h.startswith("/") else h) for t, h in links.items() if "-sl-" not in h.lower()}
    return {"title": one_line(soup.find("h1").get_text()) if soup.find("h1") else None, "fields": fields, "status_list": status_list,
            "texts": texts, "ref": source_ref("au", url, page)}


def status_list(url: str) -> dict:
    page = fetch(url, adapter="au")
    document = pymupdf.open(stream=page.body, filetype="pdf")
    lines = [one_line(x) for p in document for x in p.get_text().split("\n") if one_line(x)]
    as_of = next((_date(x) for x in lines[:20] if _date(x)), None)
    participants = []
    i = 0
    while i < len(lines):
        if re.fullmatch(r"\d{1,2}", lines[i]) and i + 4 < len(lines) and not re.fullmatch(r"[\d/-]+", lines[i + 1]):
            name, values = lines[i + 1], lines[i + 2:i + 5]
            if all(re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}|-", v) for v in values):
                participants.append({"name": name, "signature": _date(values[0]) if values[0] != "-" else None,
                                     "consent": {"date": _date(values[1]), "type": "ratification_or_accession"} if values[1] != "-" else None,
                                     "deposit": _date(values[2]) if values[2] != "-" else None})
                i += 5
                continue
        i += 1
    return {"as_of": as_of, "participants": participants, "ref": source_ref("au", url, page)}


def discover() -> dict[str, dict]:
    return {instrument_id: treaty(slug) for instrument_id, slug, *_ in AU}
