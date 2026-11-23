"""OHCHR treaty body database (tbinternet.ohchr.org): documents by committee and type.

The search page lists ten documents at a time; the next pages are requested the way the page itself
does, by posting its form back with the pager as target (an ordinary ASP.NET postback, no access
control involved). Each row gives the title, the symbol, the date and the download address of each
language version.
"""
from __future__ import annotations

import re
from html import unescape

from bs4 import BeautifulSoup

from common import es_short_date, fetch, one_line, source_ref

SEARCH = "https://tbinternet.ohchr.org/_layouts/15/TreatyBodyExternal/TBSearch.aspx"
DOWNLOAD = "https://tbinternet.ohchr.org/_layouts/15/treatybodyexternal/Download.aspx"
# TreatyID of the search page → committee acronym (read from each page's treaty selector).
TREATY_IDS = {1: "CAT", 2: "CED", 3: "CEDAW", 4: "CRPD", 5: "CRC", 6: "CERD", 7: "CMW", 8: "CCPR", 9: "CESCR", 12: "CAT-OP"}
GENERAL_COMMENTS = 11


def _form(soup) -> dict:
    form = {}
    for node in soup.find_all("input"):
        name = node.get("name")
        if not name or node.get("type") in ("submit", "image", "button", "checkbox"):
            continue
        form[name] = node.get("value", "")
    return form


def _rows(soup) -> list[dict]:
    rows = []
    for tr in soup.find_all("tr"):
        link = tr.find("a", href=re.compile(r"Download\.aspx\?symbolno=", re.I))
        if not link:
            continue
        cells = [one_line(td.get_text(" ")) for td in tr.find_all("td", recursive=False)]
        if len(cells) < 6:
            continue
        symbol = unescape(re.search(r"symbolno=([^&\"]+)", link["href"]).group(1)).replace("%2F", "/").replace("%2f", "/")
        rows.append({"title": cells[0], "type": cells[1], "committee": cells[2], "country": cells[3] or None, "symbol": cells[4] or symbol,
                     "date": es_short_date(cells[5]), "date_raw": cells[5] or None})
    return rows


def search(treaty_id: int, doc_type: int = GENERAL_COMMENTS, country_id: int | None = None, lang: str = "sp", max_pages: int = 40) -> dict:
    url = f"{SEARCH}?Lang={lang}&TreatyID={treaty_id}&DocTypeID={doc_type}" + (f"&CountryID={country_id}" if country_id else "")
    page = fetch(url, adapter="tbinternet")
    soup = BeautifulSoup(page.text(), "html.parser")
    rows = _rows(soup)
    seen = {r["symbol"] for r in rows}
    for _ in range(max_pages):
        nxt = soup.find("input", attrs={"class": "rgPageNext"})
        if not nxt or nxt.get("onclick", "").startswith("return false"):
            break
        form = _form(soup)
        form[nxt["name"]] = nxt.get("value", " ")
        form["__EVENTTARGET"] = ""
        form["__EVENTARGUMENT"] = ""
        page = fetch(url, method="POST", data=form, adapter="tbinternet")
        soup = BeautifulSoup(page.text(), "html.parser")
        new = [r for r in _rows(soup) if r["symbol"] not in seen]
        if not new:
            break
        rows += new
        seen.update(r["symbol"] for r in new)
    return {"rows": rows, "ref": source_ref("tbinternet", url, page)}


def download_url(symbol: str, lang: str = "es") -> str:
    return f"{DOWNLOAD}?symbolno={symbol.replace('/', '%2F')}&Lang={lang}"


def undocs_url(symbol: str, lang: str = "es") -> str:
    return f"https://documents.un.org/api/symbol/access?s={symbol}&l={lang}&t=pdf"
