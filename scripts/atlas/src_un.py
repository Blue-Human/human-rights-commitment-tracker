"""United Nations sources.

- OHCHR ratification dashboard (indicators.ohchr.org/webapi/dashboarddata): the list of the 18
  instruments it follows. Used for discovery only.
- UN Treaty Collection (treaties.un.org), the depositary register: entry into force, registration,
  number of signatories and parties, each participant's signature and consent to be bound with the
  depositary's own code (a = accession, d = succession...), declarations and reservations,
  objections, declarations recognising competence, notifications and the register's notes.
- OHCHR treaty body database (tbinternet.ohchr.org), in Spanish: per State, the date of entry into
  force and whether the individual communications, inquiry and inter-State procedures are accepted.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup, NavigableString, Tag

from catalog import UN_CORE, UN_DASHBOARD_ACRONYMS, UN_REFUGEES, UN_REGISTER_EXTRA
from common import clean, en_date, es_short_date, fetch, fold, log, one_line, source_ref

DASHBOARD = "https://indicators.ohchr.org/webapi/dashboarddata/"
UNTC = "https://treaties.un.org/Pages/"
TB = "https://tbinternet.ohchr.org/_layouts/15/TreatyBodyExternal/"


def untc_url(mtdsg: str, chapter: int) -> str:
    return f"{UNTC}ViewDetails.aspx?src=TREATY&mtdsg_no={mtdsg}&chapter={chapter}&clang=_en"


def _chapter_index(chapter: int, subid: str = "A") -> list[dict]:
    page = fetch(f"{UNTC}Treaties.aspx?id={chapter}&subid={subid}&clang=_en", adapter="untc")
    soup = BeautifulSoup(page.text(), "html.parser")
    entries = []
    for a in soup.find_all("a", href=re.compile(r"ViewDetails\.aspx\?src=TREATY&mtdsg_no=")):
        mtdsg = re.search(r"mtdsg_no=([^&]+)", a["href"]).group(1)
        text = one_line(a.get_text(" "))
        # "Title. Place, 16 December 1966": the place and date close the entry.
        match = re.match(r"^(.*?)\s*\.\s+([^.]+,\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*\.?$", text)
        title, place_date = (match.group(1), match.group(2)) if match else (text, None)
        entries.append({"mtdsg": mtdsg, "title": title.strip().rstrip("."), "place_date": place_date, "label": text, "chapter": chapter})
    return entries


def discover_un() -> dict[str, dict]:
    """Map each catalogue id to its register entry. The match is by exact title: the dashboard's
    18 titles against the chapter IV index of the depositary."""
    dashboard = fetch(DASHBOARD + "GetRatifications", adapter="ohchr-dashboard")
    instruments = dashboard_json(dashboard)
    by_acronym = {item["Acronym"]: item for item in instruments}
    if set(by_acronym) != set(UN_DASHBOARD_ACRONYMS.values()):
        raise RuntimeError(f"El panel del ACNUDH ha cambiado su lista de instrumentos: {sorted(by_acronym)}")
    chapter4 = _chapter_index(4)
    chapter5 = _chapter_index(5)
    found: dict[str, dict] = {}
    for instrument_id, *_ in UN_CORE:
        name = by_acronym[UN_DASHBOARD_ACRONYMS[instrument_id]]["RatificationName"]
        matches = [e for e in chapter4 if fold(e["title"]).rstrip(" .") == fold(name).rstrip(" .")]
        if len(matches) != 1:
            raise RuntimeError(f"{instrument_id}: «{name}» no aparece una sola vez en el índice del capítulo IV ({len(matches)})")
        found[instrument_id] = {**matches[0], "dashboard": by_acronym[UN_DASHBOARD_ACRONYMS[instrument_id]],
                                "dashboard_ref": source_ref("ohchr-dashboard", DASHBOARD + "GetRatifications", dashboard)}
    for instrument_id, title, *_ in UN_REGISTER_EXTRA:
        matches = [e for e in chapter4 if fold(e["title"]).startswith(fold(title))]
        if len(matches) != 1:
            raise RuntimeError(f"{instrument_id}: «{title}» no aparece una sola vez en el capítulo IV")
        found[instrument_id] = matches[0]
    for instrument_id, title, *_ in UN_REFUGEES:
        matches = [e for e in chapter5 if fold(e["title"]) == fold(title)]
        if len(matches) != 1:
            raise RuntimeError(f"{instrument_id}: «{title}» no aparece una sola vez en el capítulo V")
        found[instrument_id] = matches[0]
    return found


def dashboard_json(fetched):
    import json
    return json.loads(fetched.text())


# ---------------------------------------------------------------- depositary register (UNTC)

_CODE = re.compile(r"([A-Z][a-z]+(?: [a-z]+)?)\s*\(([A-Za-z]{1,2})\)")
_TYPES = {"ratification": "ratification", "accession": "accession", "succession": "succession", "acceptance": "acceptance",
          "approval": "approval", "formal confirmation": "formal_confirmation", "definitive signature": "definitive_signature"}


def _consent_legend(header: str) -> tuple[dict[str, str], str | None]:
    """'Accession(a), Succession(d), Ratification' → ({'a': 'accession', 'd': 'succession'}, 'ratification').
    The type written without a code is the one recorded with no suffix."""
    codes = {}
    for word, code in _CODE.findall(header):
        kind = _TYPES.get(word.lower())
        if kind:
            codes[code] = kind
    rest = _CODE.sub("", header)
    default = next((kind for word, kind in _TYPES.items() if re.search(rf"\b{word}\b", rest, re.I)), None)
    return codes, default


def _cell_text(cell: Tag) -> str:
    return one_line(cell.get_text(" "))


def _footnotes(cell: Tag) -> list[str]:
    return [one_line(sup.get_text()) for sup in cell.find_all(["sup", "superscript"]) if one_line(sup.get_text())]


def _name_without_notes(cell: Tag) -> str:
    copy = BeautifulSoup(str(cell), "html.parser")
    for sup in copy.find_all(["sup", "superscript"]):
        sup.decompose()
    return one_line(copy.get_text(" "))


def _block_text(node: Tag) -> str:
    """Text of a register entry with its line structure. `<p class='invisible'>` repeats the name."""
    copy = BeautifulSoup(str(node), "html.parser")
    for hidden in copy.select("p.invisible"):
        hidden.decompose()
    for br in copy.find_all("br"):
        br.replace_with("\n")
    for p in copy.find_all(["p", "div", "center"]):
        p.insert_before("\n")
        p.insert_after("\n")
    text = clean(copy.get_text())
    return re.sub(r"\n{3,}", "\n\n", text).strip()


_LABEL = re.compile(r"^(?:(?:Reservations?|Declarations?|Understandings?|Interpretative declarations?|Interpretative statements?|"
                    r"Statements?|Objections?|Notifications?|Communications?)(?:\s*(?:,|and|and/or)\s*(?:reservations?|declarations?|"
                    r"understandings?|interpretative declarations?|statements?))*)"
                    r"(?:\s+(?:made\s+)?upon\s+[a-z ]+?)?\s*:\s*$", re.I)


def split_labelled(text: str) -> list[dict]:
    """Cut an entry at the headings the depositary itself writes ('Reservations:', 'Declarations
    made upon signature:'), keeping each heading as written. Text before any heading has no label."""
    parts, label, buf = [], None, []
    for line in text.split("\n"):
        if _LABEL.match(line.strip()):
            if any(x.strip() for x in buf):
                parts.append({"label": label, "text": "\n".join(buf).strip()})
            label, buf = line.strip().rstrip(":").strip(), []
        else:
            buf.append(line)
    if any(x.strip() for x in buf):
        parts.append({"label": label, "text": "\n".join(buf).strip()})
    return parts


def label_kind(label: str | None) -> str:
    """Counted as a reservation when the depositary's heading says so; 'declaration' covers
    declarations, understandings and statements. Unlabelled text stays unclassified."""
    if not label:
        return "unlabelled"
    folded = label.lower()
    has_r, has_d = "reservation" in folded, any(w in folded for w in ("declaration", "understanding", "statement"))
    return "reservation_and_declaration" if has_r and has_d else "reservation" if has_r else "declaration" if has_d else "other"


def parse_untc(mtdsg: str, chapter: int) -> dict:
    url = untc_url(mtdsg, chapter)
    page = fetch(url, adapter="untc")
    soup = BeautifulSoup(page.text(), "html.parser")
    ref = source_ref("untc", url, page)

    def field(key: str) -> str:
        node = soup.find(id=re.compile(rf"ContentPlaceHolderInnerPage_{key}_ctl00_tc(?:Text|Head)$"))
        return one_line(node.get_text(" ")) if node else ""

    head = soup.find(id=re.compile(r"rptHead_ctl00_tcHead$"))
    status_as_at = None
    as_at = re.search(r"STATUS AS AT\s*:\s*(\d{2})-(\d{2})-(\d{4})", page.text())
    if as_at:
        status_as_at = f"{as_at.group(3)}-{as_at.group(2)}-{as_at.group(1)}"
    treaty_block = one_line(head.get_text(" ")) if head else ""
    eif = field("rptEIF")
    registration = field("rptRegistration")
    status = field("rptStatus")
    text_info = field("rptText")
    notes_general = [one_line(n.get_text(" ")) for n in soup.find_all(id=re.compile(r"rptNotes_ctl\d+_tcText$"))]

    signatories = re.search(r"Signatories\s*:\s*([\d,]+)", status)
    parties = re.search(r"Parties\s*:\s*([\d,]+)", status)
    meta = {
        "untc": mtdsg,
        "title_en": None,
        "conclusion": None,
        "concluded": None,
        "entry_into_force_text": eif.replace("Entry into force :", "").strip() or None,
        "entry_into_force": en_date(eif),
        "registration_text": registration.replace("Registration :", "").strip() or None,
        "status_text": status or None,
        "signatories": int(signatories.group(1).replace(",", "")) if signatories else None,
        "parties": int(parties.group(1).replace(",", "")) if parties else None,
        "text_reference": text_info.replace("Text :", "").strip() or None,
        "notes": notes_general,
        "as_of": status_as_at,
        "ref": ref,
    }
    treaty_title = soup.find(id=re.compile(r"rptTreaty_ctl00_tcText$"))
    if treaty_title:
        # "International Covenant on Civil and Political Rights New York, 16 December 1966"
        lines = [one_line(x) for x in treaty_title.get_text("\n").split("\n") if one_line(x)]
        place = next((x for x in lines if re.search(r",\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}$", x)), None)
        meta["title_en"] = " ".join(x for x in lines if x != place).rstrip(".") or None
        meta["conclusion"] = place
        meta["concluded"] = en_date(place or "")

    # Participants table.
    table = soup.find(id=re.compile(r"ContentPlaceHolderInnerPage_tblgrid$"))
    participants = []
    columns_legend = []
    if table:
        rows = table.find_all("tr")
        headers = [_cell_text(td) for td in rows[0].find_all("td")]
        columns_legend = headers
        signature_col = next((i for i, h in enumerate(headers) if re.match(r"\s*signature", h, re.I)), None)
        consent_col = next((i for i, h in enumerate(headers) if i and i != signature_col
                            and re.search(r"ratification|accession|acceptance|approval|succession|confirmation", h, re.I)), None)
        codes, default = _consent_legend(headers[consent_col]) if consent_col is not None else ({}, None)
        for row in rows[1:]:
            cells = row.find_all("td")
            if not cells:
                continue
            name = _name_without_notes(cells[0])
            entry = {"name": name, "notes": _footnotes(cells[0])}
            # The register prints between square brackets the actions of a State that is no longer
            # bound (its notes give the reason). The brackets are kept as a flag, not interpreted.
            if signature_col is not None and signature_col < len(cells):
                raw = _cell_text(cells[signature_col])
                entry["signature"] = en_date(raw)
                entry["signature_raw"] = raw or None
                if raw.startswith("["):
                    entry["signature_bracketed"] = True
            if consent_col is not None and consent_col < len(cells):
                raw = _cell_text(cells[consent_col])
                consent_date = en_date(raw)
                if consent_date:
                    suffix = re.sub(r"^.*?\d{4}", "", raw).strip()
                    suffix = re.sub(r"[\s\[\]]+", "", re.sub(r"\d", "", suffix))
                    kind = codes.get(suffix) if suffix else default
                    entry["consent"] = {"date": consent_date, "type": kind or "unknown", "code": suffix or None, "raw": raw}
                    if raw.startswith("["):
                        entry["consent"]["bracketed"] = True
                entry["consent_notes"] = _footnotes(cells[consent_col])
            extra = {headers[i]: _cell_text(c) for i, c in enumerate(cells) if i not in (0, signature_col, consent_col) and i < len(headers) and _cell_text(c)}
            if extra:
                entry["other_columns"] = extra
            participants.append(entry)

    # Sections of text keyed by participant: declarations and reservations, objections, competence
    # declarations, notifications. The title is the register's own heading.
    sections = []
    for grid in soup.find_all("table", id=re.compile(r"ContentPlaceHolderInnerPage_dg(?!NotesAll)\w+$")):
        key = re.search(r"_dg(\w+)$", grid["id"]).group(1)
        heading = grid.find_previous(class_="bold")
        title = one_line(heading.get_text(" ")) if heading else key
        title = re.sub(r"\s+\d+$", "", title)  # trailing footnote number
        intro = heading.find_next_sibling() if heading else None
        entries = []
        for participant in grid.find_all(id=re.compile(r"_divParticipant$")):
            text_node = participant.find_next_sibling(id=re.compile(r"_div(?:Notification)?Text$"))
            if not text_node:
                continue
            text = _block_text(text_node)
            entries.append({
                "name": _name_without_notes(participant),
                "notes": _footnotes(participant),
                "text": text,
                "parts": split_labelled(text) if key == "Dec" else None,
            })
        sections.append({"key": key, "title": title, "intro": one_line(intro.get_text(" ")) if isinstance(intro, Tag) else None, "entries": entries})

    # End notes: number → text.
    notes = {}
    notes_table = soup.find(id=re.compile(r"ContentPlaceHolderInnerPage_dgNotesAll$"))
    if notes_table:
        for row in notes_table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                number = one_line(cells[0].get_text(" "))
                if re.fullmatch(r"\d+", number):
                    notes[number] = _block_text(cells[1])
    if not notes:
        # Older layout: "End Note 1 ... " anchors.
        for anchor in soup.find_all("a", attrs={"name": re.compile(r"^\d+$")}):
            container = anchor.find_parent("tr") or anchor.parent
            notes[anchor["name"]] = _block_text(container)

    return {"meta": meta, "columns": columns_legend, "participants": participants, "sections": sections, "notes": notes}


# ---------------------------------------------------------------- OHCHR treaty body database

def tb_countries() -> list[dict]:
    page = fetch(TB + "Treaty.aspx?Lang=SP", adapter="tbinternet")
    soup = BeautifulSoup(page.text(), "html.parser")
    select = next((s for s in soup.find_all("select") if "country" in (s.get("name", "") + s.get("id", "")).lower()), None)
    options = select.find_all("option") if select else []
    return [{"tb_id": o["value"], "name_es": one_line(o.get_text())} for o in options if o.get("value", "").isdigit() and o["value"] != "0"]


def tb_country(tb_id: str) -> dict:
    """Per State: ratification table (with entry into force) and the three procedure tables."""
    url = TB + f"Treaty.aspx?CountryID={tb_id}&Lang=SP"
    page = fetch(url, adapter="tbinternet")
    soup = BeautifulSoup(page.text(), "html.parser")
    result = {"ref": source_ref("tbinternet", url, page), "treaties": {}, "procedures": []}
    for table in soup.find_all("table"):
        headers = [one_line(th.get_text(" ")) for th in table.find_all("th")]
        if not headers or "Tratado" not in headers:
            continue
        rows = []
        for tr in table.find_all("tr"):
            cells = [one_line(td.get_text(" ")) for td in tr.find_all("td", recursive=False)]
            if len(cells) >= 7 and cells[0]:
                rows.append(cells)
        joined = " ".join(headers)
        if "Fecha de entrada en vigor" in joined:
            for c in rows:
                # País, País, Tratado, Description, Name, firma, ratificación/adhesión(a)/sucesión(b), denuncia, ratificación, entrada en vigor, ...
                if len(c) < 10:
                    continue
                acronym = c[4]
                result["treaties"][acronym] = {
                    "name_es": c[3],
                    "signature": es_short_date(c[5]),
                    "consent_raw": c[6] or None,
                    "consent": es_short_date(c[6]),
                    "consent_code": (re.search(r"\(([a-z])\)", c[6]) or [None, None])[1] if c[6] else None,
                    "denunciation": es_short_date(c[7]),
                    "entry_into_force": es_short_date(c[9]),
                }
        else:
            kind = ("individual" if "comunicaciones individuales" in joined else "inquiry" if "investigación" in joined
                    else "interstate" if "interestatal" in joined else None)
            if not kind:
                continue
            for c in rows:
                if len(c) < 7:
                    continue
                result["procedures"].append({"kind": kind, "code": c[4], "name_es": c[3], "accepted": c[5] or None, "date": es_short_date(c[6])})
    return result
