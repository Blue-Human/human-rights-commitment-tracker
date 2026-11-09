"""Where the text of each instrument is read from, and how it becomes a reader file.

Each entry names an official publication by its identifier (BOE number, UN document symbol, URL of
the body that publishes it), checked against the title the source returns. `start` and `end` cut
one instrument out of a publication that holds several (the BOE consolidates the European
Convention with its protocols, and the Refugee Convention with its Protocol).
"""
from __future__ import annotations

import re

import pymupdf
from bs4 import BeautifulSoup

import src_boe
import texts
from common import clean, fetch, fold, one_line, source_ref

# authority:
#   authentic     the language is one of the treaty's authentic texts (checked against the
#                 treaty's own clause on authentic texts, quoted in the file)
#   official_es   Spanish translation published in the Spanish official gazette, for a treaty whose
#                 authentic texts are other languages
#   body          text published by the treaty body or court itself
BOE_TEXTS = {
    # id: (BOE id, phrase its title must contain, start, end)
    "un-icescr": ("BOE-A-1977-10734", "Pacto Internacional de Derechos Económicos, Sociales y Culturales", None, None),
    "un-icescr-op": ("BOE-A-2013-2081", "Protocolo Facultativo del Pacto Internacional de Derechos Económicos", None, None),
    "un-iccpr": ("BOE-A-1977-10733", "Pacto Internacional de Derechos Civiles y Políticos", None, None),
    "un-iccpr-op1": ("BOE-A-1985-5259", "Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos", None, None),
    "un-iccpr-op2": ("BOE-A-1991-17792", "Segundo Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos", None, None),
    "un-cedaw": ("BOE-A-1984-6749", "Convención sobre la eliminación de todas las formas de discriminación contra la mujer", None, None),
    "un-cedaw-op": ("BOE-A-2001-15664", "Protocolo Facultativo de la Convención sobre la eliminación de todas las formas de discriminación contra la mujer", None, None),
    "un-opcat": ("BOE-A-2006-11128", "Protocolo facultativo a la Convención contra la tortura", None, None),
    "un-crc": ("BOE-A-1990-31312", "Convención sobre los Derechos del Niño", None, None),
    "un-crc-opac": ("BOE-A-2002-7293", "participación de niños en conflictos armados", None, None),
    "un-crc-opsc": ("BOE-A-2002-1858", "venta de niños, la prostitución infantil", None, None),
    "un-crc-opic": ("BOE-A-2014-966", "procedimiento de comunicaciones", None, None),
    "un-crpd": ("BOE-A-2008-6963", "Convención sobre los derechos de las personas con discapacidad", None, None),
    "un-crpd-op": ("BOE-A-2008-6996", "Protocolo Facultativo a la Convención sobre los derechos de las personas con discapacidad", None, None),
    "un-ced": ("BOE-A-2011-3164", "desapariciones forzadas", None, None),
    "un-cat": ("BOE-A-1987-25053", "Convención contra la tortura", None, None),
    "un-refugees-1951": ("BOE-A-1978-26331", "Convención sobre el Estatuto de los Refugiados", r"^CONVENCIÓN SOBRE EL ESTATUTO", r"^PROTOCOLO SOBRE EL ESTATUTO"),
    "un-refugees-1967": ("BOE-A-1978-26331", "Protocolo sobre el Estatuto de los Refugiados", r"^PROTOCOLO SOBRE EL ESTATUTO", None),
    "coe-echr": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos y de las libertades fundamentales", r"^CONVENIO PARA LA PROTECCIÓN", r"^PROTOCOLO ADICIONAL"),
    "coe-echr-p1": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO ADICIONAL AL CONVENIO", r"^PROTOCOLO N[ÚU]MERO 4"),
    "coe-echr-p4": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N[ÚU]MERO 4", r"^PROTOCOLO N[ÚU]MERO 6"),
    "coe-echr-p6": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N[ÚU]MERO 6", r"^PROTOCOLO N[ÚU]MERO 7"),
    "coe-echr-p7": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N[ÚU]MERO 7", r"^PROTOCOLO N\.?\s?º 12"),
    "coe-echr-p12": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N\.?\s?º 12", r"^PROTOCOLO N\.?\s?º 13"),
    "coe-echr-p13": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N\.?\s?º 13", r"^PROTOCOLO N\.?\s?º 16"),
    "coe-echr-p16": ("BOE-A-1999-10148", "Convenio para la protección de los derechos humanos", r"^PROTOCOLO N\.?\s?º 16", r"^Información relacionada"),
    "coe-esc-1961": ("BOE-A-1980-13567", "Carta Social Europea", None, None),
    "coe-esc-revised": ("BOE-A-2021-9719", "Carta Social Europea (revisada)", None, None),
    "coe-esc-collective": ("BOE-A-2021-10683", "sistema de reclamaciones colectivas", None, None),
    "coe-cpt": ("BOE-A-1989-15618", "Convenio Europeo para la prevención de la tortura", None, None),
    "coe-fcnm": ("BOE-A-1998-1369", "Convenio-marco para la protección de las Minorías Nacionales", None, None),
    "coe-trafficking": ("BOE-A-2009-14405", "trata de seres humanos", None, None),
    "coe-lanzarote": ("BOE-A-2010-17392", "explotación y el abuso sexual", None, None),
    "coe-istanbul": ("BOE-A-2014-5947", "violencia contra la mujer y la violencia doméstica", None, None),
}

# Spain's own instrument for treaties whose reader text comes from a consolidated publication
# (the BOE consolidates the European Convention and its protocols in BOE-A-1999-10148). Its title
# gives the official Spanish name, and its notes the date of entry into force for Spain.
SPAIN_INSTRUMENT = {
    "coe-echr": "BOE-A-1979-24010", "coe-echr-p1": "BOE-A-1991-723", "coe-echr-p4": "BOE-A-2009-16302", "coe-echr-p6": "BOE-A-1985-6019",
    "coe-echr-p7": "BOE-A-2009-16399", "coe-echr-p12": "BOE-A-2008-4891", "coe-echr-p13": "BOE-A-2010-5208", "coe-echr-p16": "BOE-A-2025-18339",
    "coe-esc-collective": "BOE-A-2022-17976", "un-refugees-1951": "BOE-A-1978-26331", "un-refugees-1967": "BOE-A-1978-26331",
    # No reader text (the BOE has only an image or an unreliable transcription), but the title
    # and the notes on Spain are read from the gazette.
    "un-genocide": "BOE-A-1969-170", "un-crc-amend-43": "BOE-A-2000-15123", "coe-trafficking": "BOE-A-2009-14405",
    "un-cat": "BOE-A-1987-25053",
}

# Instruments whose authentic texts include Spanish: their Spanish text is an authentic version.
# Checked in the build against the clause quoted from each text (see texts.authentic_languages).
UN_SYSTEM = ("un-",)

SKIP_BLOCK_TYPES = {"instrumento", "nota_inicial", "parte_dispositiva"}

# Articles that the official publication itself prints without a final stop, checked by hand
# against the source page; the integrity check accepts them and the reason is published.
UNPUNCTUATED = {
    "coe-fcnm": {"2": "La publicación del BOE (BOE-A-1998-1369) cierra este artículo con una coma."},
    "au-achpr": {"3": "La Comisión Africana publica los dos apartados de este artículo sin punto final."},
    "oas-american-declaration": {"XXVI": "La Comisión Interamericana publica este artículo sin punto final.",
                                 "XXXV": "La Comisión Interamericana publica este artículo sin punto final."},
}


def boe_items(boe_id: str) -> tuple[list[dict], dict]:
    """Paragraphs of a BOE publication in reading order, and what the BOE adds around the treaty
    (Spain's instrument, the BOE's own notes)."""
    extras = {"spain_instrument": [], "boe_notes": [], "versions": []}
    if src_boe.consolidated_available(boe_id):
        doc = src_boe.text(boe_id)
        items = []
        norms = {}
        for block in doc["blocks"]:
            if not block["versions"]:
                continue
            latest = block["versions"][-1]
            for version in block["versions"]:
                norms[version["norm"]] = version["published"]
            paragraphs = [p for p in latest["paragraphs"]]
            if block["type"] == "instrumento":
                extras["spain_instrument"] = [p["text"] for p in paragraphs if p.get("text")]
                continue
            if block["type"] in ("nota_inicial", "parte_dispositiva"):
                extras["boe_notes"] += [p["text"] for p in paragraphs if p.get("text") and p["class"] not in ("siempreSeVe",)]
                continue
            history = [{"norm": v["norm"], "published": v["published"], "in_force": v["in_force"],
                        "paragraphs": [p.get("text") for p in v["paragraphs"] if p.get("text")]} for v in block["versions"][:-1]]
            # Paragraphs the BOE marks as "cita" inside a provision are its own annotations
            # (amendments, the previous wording, Spain's declarations): kept with the article as
            # notes of the BOE, never mixed with the treaty's text.
            notes = [p["text"] for p in paragraphs if p.get("text") and ("cita" in p["class"].split() or "nota_pie" in p["class"])]
            first = True
            for paragraph in paragraphs:
                if "cita" in paragraph["class"].split() or "nota_pie" in paragraph["class"] or "inforel" in paragraph["class"]:
                    if block["type"] != "precepto":
                        extras["boe_notes"].append(paragraph.get("text"))
                    continue
                item = dict(paragraph)
                if first and block["type"] == "precepto":
                    item["block"] = block["id"]
                    item["current_version"] = {"norm": latest["norm"], "published": latest["published"], "in_force": latest["in_force"]}
                    if history:
                        item["history"] = history
                    if notes:
                        item["notes"] = notes
                first = False
                items.append(item)
        extras["versions"] = sorted(({"norm": n, "published": d} for n, d in norms.items()), key=lambda v: v["published"] or "")
        return items, {**extras, "method": "boe-consolidated", "meta": doc["meta"], "ref": doc["ref"]}
    doc = src_boe.gazette(boe_id)
    paragraphs = doc["paragraphs"]
    # Some issues carry no paragraph classes: there the instrument ends with the minister's name,
    # printed after "El Ministro de Asuntos Exteriores".
    if not any(p.get("class", "").lower() in ("firma_ministro", "rvd_firma") for p in paragraphs[:40]):
        for i, p in enumerate(paragraphs[:40]):
            if re.match(r"^(El|La) Ministr[oa] de Asuntos Exteriores", p.get("text") or ""):
                cut = i + 1 if len(p["text"]) > 60 else i + 2
                extras["spain_instrument"] = [x["text"] for x in paragraphs[:cut] if x.get("text")]
                return paragraphs[cut:], {**extras, "method": "boe-gazette", "meta": doc["meta"], "ref": doc["ref"]}
    # Spain's instrument opens the issue and closes with the King's and the minister's signatures.
    cut = 0
    for i, p in enumerate(paragraphs[:40]):
        if p.get("class", "").lower() in ("firma_ministro", "rvd_firma") or re.match(r"^(JUAN CARLOS R\.|FELIPE R\.)", p.get("text") or ""):
            cut = i + 1
        if cut and p.get("class", "").lower() in ("firma_ministro",) and i + 1 < len(paragraphs) and paragraphs[i + 1].get("class", "").lower() != "firma_ministro":
            cut = i + 1
            break
    extras["spain_instrument"] = [p["text"] for p in paragraphs[:cut] if p.get("text")]
    return paragraphs[cut:], {**extras, "method": "boe-gazette", "meta": doc["meta"], "ref": doc["ref"]}


_STOP_NAMES: frozenset | None = None


def stop_names() -> frozenset:
    """Country names in Spanish: a line holding only one of them, after the articles, is the start
    of the gazette's list of declarations by State."""
    global _STOP_NAMES
    if _STOP_NAMES is None:
        from src_countries import load_m49
        countries, _ = load_m49()
        _STOP_NAMES = frozenset(n for c in countries for n in (c["name_es"], c["name_en"]) if n) | {"Unión Europea", "Comunidad Europea"}
    return _STOP_NAMES


def from_boe(instrument_id: str) -> dict:
    boe_id, phrase, start, end = BOE_TEXTS[instrument_id]
    items, extras = boe_items(boe_id)
    title = extras["meta"].get("titulo") or ""
    if fold(phrase) not in fold(title) and fold(phrase) not in fold(" ".join(p.get("text", "") for p in items[:5])):
        raise RuntimeError(f"{instrument_id}: el título de {boe_id} no contiene «{phrase}»: {title}")
    result = texts.structure(items, start=start, end=end, stop_names=stop_names())
    stated = texts.stated_article_count(extras["spain_instrument"]) if not start else None
    quality = texts.check(result, stated=stated, exempt=UNPUNCTUATED.get(instrument_id))
    trailing_notes = [one_line(p.get("text")) for p in result.pop("trailing") if p.get("text")]
    published = extras["meta"].get("fecha_publicacion")
    return {
        "lang": "es",
        "title": result["title"],
        "source": {
            "publisher": "Boletín Oficial del Estado",
            "document": title,
            "identifier": boe_id,
            "url": src_boe.human_url(boe_id),
            "data_url": extras["ref"]["url"],
            "eli": extras["meta"].get("url_eli"),
            "published": _iso(published),
            "retrieved": extras["ref"].get("retrieved"),
            "sha256": extras["ref"].get("sha256"),
            "method": extras["method"],
        },
        "versions": extras["versions"],
        "preamble": result["preamble"],
        "nodes": result["nodes"],
        "final_clauses": result["final_clauses"],
        "spain_instrument": extras["spain_instrument"],
        "publication_notes": [n for n in extras["boe_notes"] if n] + trailing_notes,
        "authentic_clause": texts.authentic_languages(result),
        "quality": quality,
    }


def _iso(value: str | None) -> str | None:
    if not value:
        return None
    value = re.sub(r"\D", "", value)
    return f"{value[:4]}-{value[4:6]}-{value[6:8]}" if len(value) == 8 else None


# ---------------------------------------------------------------- other publications

def pdf_lines(body: bytes) -> list[str]:
    """Text blocks of a PDF in reading order. Footnote markers (digits set in a much smaller type
    than the line they sit in, as in "Artículo 52¹") are left out, so that they do not join the
    number they follow."""
    document = pymupdf.open(stream=body, filetype="pdf")
    lines = []
    for page in document:
        for block in page.get_text("dict", sort=True)["blocks"]:
            if block.get("type") != 0:
                continue
            block_lines = []
            for line in block["lines"]:
                spans = line["spans"]
                sizes = sorted(s["size"] for s in spans if s["text"].strip())
                if not sizes:
                    continue
                body_size = sizes[len(sizes) // 2] if len(sizes) > 2 else max(sizes)
                text = "".join(s["text"] for s in spans
                               if not (re.fullmatch(r"\s*\d{1,2}\s*", s["text"]) and s["size"] < 0.8 * body_size and len(spans) > 1))
                block_lines.append(text)
            text = clean("\n".join(block_lines))
            if text:
                lines.append(text)
    return lines


def from_un_resolution(symbol: str, lang: str, start: str, end: str | None = None) -> dict:
    """Annex of a born-digital General Assembly resolution (documents.un.org)."""
    url = f"https://documents.un.org/api/symbol/access?s={symbol}&l={lang}&t=pdf"
    page = fetch(url, adapter="undocs")
    blocks = pdf_lines(page.body)
    items = []
    for block in blocks:
        # Running heads and page numbers of the UN layout.
        if re.fullmatch(r"(\d+|\d+/\d+|[A-Z]/RES/\S+|\d{2}-\d{5}\S*)", one_line(block)) or re.match(r"^A/RES/\d+/\d+\s*$", one_line(block)):
            continue
        # A block may hold the article heading and its first sentence on separate lines.
        lines = block.split("\n")
        if texts.ART.match(lines[0]) and len(lines) > 1:
            items.append({"text": lines[0]})
            rest = "\n".join(lines[1:])
            items.append({"text": rest})
        else:
            items.append({"text": block.replace("\n", " ")})
    result = texts.structure(items, start=start, end=end)
    result.pop("trailing")
    return {
        "lang": lang,
        "title": result["title"],
        "source": {"publisher": "Naciones Unidas, Asamblea General", "document": f"Resolución {symbol}", "identifier": symbol,
                   "url": url, "retrieved": page.fetched_at[:10], "sha256": page.sha256, "method": "un-pdf"},
        "versions": [],
        "preamble": result["preamble"], "nodes": result["nodes"], "final_clauses": result["final_clauses"],
        "authentic_clause": texts.authentic_languages(result),
        "quality": texts.check(result),
    }


def html_items(root, breaks: str) -> list[dict]:
    """The paragraphs of an HTML page, read in one of three ways, since each site marks paragraphs
    differently:
      "newline"    every line (separated by <br>) is a paragraph (African Commission);
      "container"  every innermost block is a paragraph, its line breaks being wraps; several
                   articles sharing a block are cut at "Artículo N. " (OAS);
      "unwrap"     lines are joined back into paragraphs (see `unwrap`)."""
    from bs4 import NavigableString, Tag
    blocks = ("p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "div", "td", "th", "pre", "blockquote", "center")
    # Every piece of text, grouped by its nearest block: text that sits directly in a cell next to
    # paragraphs is kept too, in reading order.
    groups: list[list[str]] = []
    owner = None
    for node in root.descendants:
        if isinstance(node, Tag):
            if node.name == "br" and groups:
                groups[-1].append("\n")
            continue
        if not isinstance(node, NavigableString) or not str(node).strip() or node.parent.name in ("script", "style"):
            continue
        block = node.find_parent(blocks)
        if block is not owner or not groups:
            groups.append([])
            owner = block
        groups[-1].append(str(node))
    items, wrapped = [], []
    script = re.compile(r"(^ga\(|^\(function|^var\s|^window\.|^document\.|script src=|</?script|^function\s)")
    for group in groups:
        raw = "".join(group)
        if script.search(raw.strip()) or re.fullmatch(r"\s*\[\d+\]\s*", raw):
            continue
        if breaks == "container":
            text = one_line(raw)
            for piece in re.split(r"(?=\bArt[íi]culo\s+(?:\d+|[IVXLC]+)\.\s)", text):
                if piece.strip():
                    items.append({"text": piece.strip()})
            continue
        lines = [one_line(x) for x in clean(raw).split("\n") if one_line(x)]
        if breaks == "unwrap":
            wrapped.extend(lines)
        else:
            items.extend({"text": line} for line in lines)
    if breaks == "unwrap":
        items = [{"text": t} for t in unwrap(wrapped)]
    return items


def from_html(url: str, *, lang: str, publisher: str, document: str, start: str, end: str | None = None,
              encoding: str | None = None, selector: str | None = None, adapter: str = "html", breaks: str | tuple = "newline",
              declaration: bool = False, headings_beside: bool = False, instrument: str | None = None) -> dict:
    """`breaks` names how the site marks paragraphs (see `html_items`); with several, the first
    reading that passes every integrity check is kept, or the last one tried if none does."""
    page = fetch(url, adapter=adapter)
    soup = BeautifulSoup(page.text(encoding), "html.parser")
    for junk in soup(["script", "style", "nav", "header", "footer", "noscript"]):
        junk.decompose()
    root = (soup.select_one(selector) if selector else None) or soup.body or soup
    result = None
    for mode in (breaks,) if isinstance(breaks, str) else breaks:
        try:
            attempt = texts.structure(html_items(root, mode), start=start, end=end, headings_beside=headings_beside)
        except RuntimeError:
            continue
        attempt["quality"] = texts.check(attempt, declaration=declaration, exempt=UNPUNCTUATED.get(instrument or ""))
        attempt["reading"] = mode
        result = attempt
        if attempt["quality"]["complete"]:
            break
    if result is None:
        raise RuntimeError(f"No se encuentra el inicio del instrumento ({start})")
    result.pop("trailing")
    return {
        "lang": lang,
        "title": result["title"],
        "source": {"publisher": publisher, "document": document, "url": url, "retrieved": page.fetched_at[:10],
                   "sha256": page.sha256, "method": f"html:{result['reading']}"},
        "versions": [],
        "preamble": result["preamble"], "nodes": result["nodes"], "final_clauses": result["final_clauses"],
        "authentic_clause": texts.authentic_languages(result),
        "quality": result["quality"],
    }


def unwrap(lines: list[str]) -> list[str]:
    """Rebuild paragraphs from lines broken by the page's width. A new paragraph starts with an
    article, a heading or an enumeration ("1.", "a)"), or after a line that ends a sentence. No
    word is changed or dropped: lines are only joined with a space."""
    out: list[str] = []
    for line in lines:
        # "Artículo 4. Derecho a la Vida 1. Toda persona..." holds the heading and the text.
        pieces = [x.strip() for x in re.split(r"(?=\bArt[íi]culo\s+\d+\.\s)", line) if x.strip()]
        for piece in pieces:
            starts = (texts.ART.match(piece) or texts.HEAD.match(piece) or texts.PREAMBLE.match(piece) or texts.ANNEX.match(piece)
                      or texts.TESTIMONIUM.match(piece) or re.match(r"^(\d+\.|[a-z]\)|\([a-z]\)|[ivx]+[.)])\s", piece)
                      # A recital opens with its verb in capitals ("CONSIDERANDO que", "LOS ESTADOS PARTES").
                      or re.match(r"^([A-ZÁÉÍÓÚÑ]{5,}|[A-ZÁÉÍÓÚÑ]{2,}\s+[A-ZÁÉÍÓÚÑ]{3,})\b", piece))
            previous = out[-1] if out else ""
            # A short line right after an article number is its heading: kept apart.
            after_number = len(out) >= 2 and texts.ART.match(out[-2]) and len(previous) <= 80 and not re.search(r"[.;:,]\s*$", previous)
            if not out or starts or after_number or re.search(r"[.:;]\s*$", previous) or texts.ART.match(previous) and len(previous) < 120 \
                    or texts.HEAD.match(previous) or previous.isupper():
                out.append(piece)
            else:
                out[-1] = f"{previous} {piece}"
    return out


def from_pdf_url(url: str, *, lang: str, publisher: str, document: str, start: str, end: str | None = None, adapter: str = "pdf") -> dict:
    page = fetch(url, adapter=adapter)
    items = []
    for block in pdf_lines(page.body):
        lines = block.split("\n")
        if texts.ART.match(lines[0]) and len(lines) > 1:
            items.append({"text": lines[0]})
            items.append({"text": " ".join(lines[1:])})
        else:
            items.append({"text": block.replace("\n", " ")})
    result = texts.structure(items, start=start, end=end)
    result.pop("trailing")
    return {
        "lang": lang,
        "title": result["title"],
        "source": {"publisher": publisher, "document": document, "url": url, "retrieved": page.fetched_at[:10],
                   "sha256": page.sha256, "method": "pdf"},
        "versions": [],
        "preamble": result["preamble"], "nodes": result["nodes"], "final_clauses": result["final_clauses"],
        "authentic_clause": texts.authentic_languages(result),
        "quality": texts.check(result),
    }
