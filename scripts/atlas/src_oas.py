"""Organization of American States, Department of International Law (www.oas.org).

For each inter-American human-rights treaty the Department publishes the Spanish text (Spanish is
one of its authentic languages) and a table of signatures and ratifications with the depositary's
own codes (RA = ratificación, AD = adhesión...), followed by the declarations, reservations,
denunciations and withdrawals each State made, under its name. The adapter reads both pages.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from catalog import OAS
from common import clean, fetch, fold, one_line, source_ref

BASE = "http://www.oas.org/juridico/spanish/"
INDEX = "http://www.oas.org/es/sla/ddi/tratados_multilaterales_interamericanos_texto_materia.asp"
SIGNATURES_INDEX = "http://www.oas.org/es/sla/ddi/tratados_multilaterales_interamericanos_firmas_materia.asp"
CODES = {"RA": "ratification", "AD": "accession", "AC": "acceptance"}


def _follow(url: str):
    """The Department's older addresses forward with a script to the current page."""
    page = fetch(url, adapter="oas")
    for _ in range(3):
        text = _decode(page.body)
        target = re.search(r'window\.location(?:\.href)?\s*=\s*"([^"]+)"', text)
        if not target or len(text) > 4000:
            return page, url, text
        url = target.group(1)
        page = fetch(url, adapter="oas")
    return page, url, text


def _decode(body: bytes) -> str:
    try:
        return body.decode("utf-8")
    except UnicodeDecodeError:
        return body.decode("windows-1252", errors="replace")


def discover() -> dict[str, dict]:
    """Text and signature pages of each catalogued treaty, read from the Department's indexes by
    subject. The code in brackets in each entry, "(B-32)", is the key."""
    found = {}
    for kind, url in (("text", INDEX), ("signatures", SIGNATURES_INDEX)):
        page = fetch(url, adapter="oas")
        soup = BeautifulSoup(page.text("utf-8"), "html.parser")
        for a in soup.find_all("a", href=True):
            label = one_line(a.get_text(" "))
            code = re.search(r"\(([AB]-\d+)\)\s*$", label)
            if code:
                found.setdefault(code.group(1), {})[kind] = a["href"]
                found[code.group(1)].setdefault("label", label)
    result = {}
    for instrument_id, code, *_ in OAS:
        entry = found.get(code, {})
        text = entry.get("text") or f"{BASE}tratados/{code.lower()}.html"
        signatures = entry.get("signatures") or f"{BASE}firmas/{code.lower()}.html"
        result[instrument_id] = {"code": code, "text": text, "signatures": signatures, "label": entry.get("label")}
    return result


DATE = r"\d{1,2}/\d{1,2}/\d{2,4}"
SLOT = re.compile(rf"({DATE})|(--/--/--|/\s*/(?!\d))|\b(RA|AD|AC)\b")


BASIC_DOCUMENTS = "https://www.oas.org/es/cidh/mandato/documentos_basicos.asp"


def basic_titles() -> tuple[dict[str, str], dict]:
    """Official Spanish titles of the inter-American instruments, as the Commission lists them on
    its page of basic documents. Keyed by the treaty code of the link ("a-51" → "A-51")."""
    page = fetch(BASIC_DOCUMENTS, adapter="oas")
    soup = BeautifulSoup(_decode(page.body), "html.parser")
    titles = {}
    for a in soup.find_all("a", href=True):
        code = re.search(r"(?:tratados?|Tratados)[/_](?:multilaterales_interamericanos_)?([ab]-\d+)", a["href"], re.I)
        label = one_line(a.get_text(" "))
        if code and label and not label.startswith("Signatarios"):
            titles.setdefault(code.group(1).upper(), label)
    return titles, source_ref("oas", BASIC_DOCUMENTS, page)


def _date(value: str | None) -> tuple[str | None, str | None]:
    """The Department prints month/day/year ('11/22/69'). A few recent entries are day/month/year
    ('13/07/20'): when the first number cannot be a month, it is read as a day and flagged."""
    match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", value or "")
    if not match:
        return None, None
    a, b, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    if year < 100:
        year += 1900 if year >= 40 else 2000
    if 1 <= a <= 12 and 1 <= b <= 31:
        return f"{year:04d}-{a:02d}-{b:02d}", None
    if 1 <= b <= 12 and 1 <= a <= 31:
        return f"{year:04d}-{b:02d}-{a:02d}", "día/mes/año"
    return None, None


def _rows(soup) -> list[str]:
    """Each line of the table of signatures as text, whatever the page's layout: an HTML table, or
    a fixed-width listing ('Argentina ........... 11/17/88 06/30/03 10/23/03 RA')."""
    lines = []
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) >= 3 and not row.find("tr"):
            lines.append(" ".join(one_line(c.get_text(" ")) for c in cells))
    for block in soup.find_all(["pre", "td", "p", "div"]):
        if block.find(["td", "table"]):
            continue
        text = block.get_text("\n")
        if "...." in text or re.search(rf"\n[^\n]+?\s{DATE}\s", text):
            lines.extend(x for x in text.split("\n") if x.strip())
    return lines


ROW = re.compile(rf"^\s*(?P<name>[A-Za-zÁÉÍÓÚÑáéíóúñü][^\d/=*]*?)[\s.]*\s(?P<rest>(?:{DATE}|--/--/--|/\s*/|-)(?:.*))$")


def signatures(url: str) -> dict:
    page, final_url, text = _follow(url)
    soup = BeautifulSoup(text, "html.parser")
    for junk in soup(["script", "style"]):
        junk.decompose()
    body = clean(soup.get_text("\n"))
    head = {}
    for key, pattern in (("adopted_place", r"ADOPTAD[OA] EN\s*:\s*([^\n]+?)(?:\s+FECHA|$)"), ("adopted", r"FECHA\s*:\s*([\d/]+)"),
                         ("entry_into_force", r"ENTRADA EN VIGOR\s*:\s*([\d/]+)"), ("entry_into_force_text", r"ENTRADA EN VIGOR\s*:\s*([^\n]+?)(?:\s+DEPOSITARIO|$)"),
                         ("depositary", r"DEPOSITARIO\s*:\s*([^\n]+?)(?:\s+TEXTO|$)")):
        match = re.search(pattern, re.sub(r"\s+", " ", body))
        if match:
            head[key] = one_line(match.group(1))
    for key in ("adopted", "entry_into_force"):
        if key in head:
            head[key] = _date(head[key])[0]

    participants, seen = [], set()
    for line in _rows(soup):
        line = one_line(line)
        match = ROW.match(line)
        if not match:
            continue
        name = one_line(match.group("name")).rstrip(" .:*")
        if not name or re.search(r"pa[ií]ses|signatarios|firma|referencia|instrumento|entrada en vigor|fecha|registro|adoptad|depositario|texto", name, re.I) or fold(name) in seen:
            continue
        slots, code = [], None
        for token in SLOT.finditer(match.group("rest")):
            if token.group(3):
                code = code or token.group(3)
            elif len(slots) < 3:
                slots.append(token.group(1))
        if not slots:
            continue
        slots += [None] * (3 - len(slots))
        (signature, f1), (consent, f2), (deposit, f3) = (_date(x) for x in slots)
        if not (signature or consent or deposit) and len(match.group("rest").strip("-/ ")) == 0:
            pass
        seen.add(fold(name))
        entry = {"name": name, "signature": signature, "consent_date": consent, "deposit": deposit,
                 "raw": match.group("rest")}
        if consent or deposit:
            entry["consent"] = {"date": consent or deposit, "type": CODES.get(code, "unknown") if code else "unknown", "code": code}
        if any((f1, f2, f3)):
            entry["date_reading"] = "Alguna fecha figura en el formato día/mes/año"
        participants.append(entry)

    # Declarations, reservations, denunciations and withdrawals, after the legend of codes.
    legend = re.search(r"INFORMA(?:CION)?\s*=\s*INFORMACION REQUERIDA POR EL TRATADO[^\n]*", body)
    tail = body[legend.end():] if legend else ""
    tail = re.split(r"\[\s*Texto del Tratado|\n\s*Volver|Departamento de Derecho Internacional\s*$", tail)[0].strip()
    statements = {}
    if tail:
        names = sorted({p["name"] for p in participants}, key=len, reverse=True)
        pattern = re.compile(r"(?:^|\n)\s*(?:\d+\s*\.?-?\s*)?(" + "|".join(re.escape(n) for n in names) + r")\b\s*[:(]", re.I)
        marks = list(pattern.finditer(tail))
        for i, mark in enumerate(marks):
            chunk = tail[mark.start(): marks[i + 1].start() if i + 1 < len(marks) else len(tail)].strip()
            key = next(n for n in names if fold(n) == fold(mark.group(1)))
            statements.setdefault(key, []).append(chunk)
    return {"head": head, "participants": participants, "statements": statements, "statements_text": tail or None,
            "ref": source_ref("oas", final_url, page)}


def text_page(url: str) -> tuple[str, str, object]:
    page, final_url, text = _follow(url)
    return final_url, text, page
