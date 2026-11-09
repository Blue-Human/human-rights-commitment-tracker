"""Procedural documents: rules of procedure of the bodies and constituent resolutions.

They are read like the treaties (articles, with their headings) and enter the library as procedural
instruments, so that procedure pages can quote a rule word for word. The current version of each set
of rules is the one the OHCHR treaty body database lists as latest (document type "Reglas de
procedimiento"), checked by its symbol.
"""
from __future__ import annotations

import re

import src_texts
import texts
from common import fetch, one_line, source_ref

UNDOCS = "https://documents.un.org/api/symbol/access?s={symbol}&l={lang}&t=pdf"

# id: (symbol or URL, language, body, title the document must contain, kind)
DOCUMENTS = {
    "un-ccpr-rules": ("CCPR/C/3/Rev.12", "es", "un-ccpr", "Reglamento del Comité de Derechos Humanos", "rules"),
    "un-cedaw-rules": ("CEDAW/C/1", "es", "un-cedaw", "Reglamento", "rules"),
    "un-cescr-op-rules": ("E/C.12/5", "es", "un-cescr", "Reglamento", "rules"),
    "un-crpd-rules": ("CRPD/C/1/Rev.1", "es", "un-crpd", "Reglamento", "rules"),
    "un-crc-opic-rules": ("CRC/C/158", "es", "un-crc", "Reglamento", "rules"),
    "un-ced-rules": ("CED/C/1/Rev.3", "es", "un-ced", "Reglamento", "rules"),
}
HTML_DOCUMENTS = {
    # id: (url, body, start, title)
    "oas-iachr-rules": ("https://www.oas.org/es/cidh/mandato/Basicos/reglamentoCIDH.asp", "oas-iachr",
                        r"^(T[ÍI]TULO I|Título I)\b", "Reglamento de la Comisión Interamericana de Derechos Humanos",
                        r"(Aprobad[oa] por la Comisión Interamericana|Contáctenos|^\[\d+\]\s)"),
    "oas-iachr-statute": ("https://www.oas.org/es/cidh/mandato/Basicos/estatutoCIDH.asp", "oas-iachr",
                          r"^(I\.\s*NATURALEZA|NATURALEZA Y PROP|Art[íi]culo 1\b)", "Estatuto de la Comisión Interamericana de Derechos Humanos",
                          r"^(\[\d+\]\s|Aprobado mediante)"),
}


RUNNING_HEAD = re.compile(r"^(\d+|\d+/\d+|[A-Z]+/[A-Z0-9./]+(?:/Rev\.\d+)?(?:\s+\d+)?|\d{2}-\d{5}\S*|GE\.\d{2}-\d+.*|\d+\s+GE\.\d{2}-\d+.*|"
                          r"[A-Z]+/[A-Z0-9./]+(?:/Rev\.\d+)?\s+GE\.\d{2}-\d+.*)$")


def pdf_items(body: bytes, symbol: str = "") -> list[dict]:
    """Paragraphs of a UN document, without its running heads (symbol, job number, page number),
    its table of contents, and with the paragraphs that a page break cut joined again: a block
    that does not end a sentence, followed by one that starts in lower case, is one paragraph."""
    blocks = []
    for block in src_texts.pdf_lines(body):
        line = one_line(block)
        if re.search(r"\.{5,}", line) or RUNNING_HEAD.match(line) or (symbol and line in (symbol, symbol.replace("/", " / "))):
            continue
        lines = [x.strip() for x in block.split("\n") if x.strip()]
        if texts.ART.match(one_line(lines[0])) and len(lines) > 1:
            blocks.append(one_line(lines[0]))
            blocks.append(" ".join(lines[1:]))
        else:
            blocks.append(line)
    items: list[dict] = []
    for text in blocks:
        previous = items[-1]["text"] if items else ""
        if previous and not re.search(r"[.;:]\s*$", previous) and text[:1].islower() and not texts.ART.match(previous):
            items[-1]["text"] = f"{previous} {text}"
        else:
            items.append({"text": text})
    return items


def un_document(instrument_id: str) -> dict:
    symbol, lang, body, title, kind = DOCUMENTS[instrument_id]
    url = UNDOCS.format(symbol=symbol, lang=lang)
    page = fetch(url, adapter="undocs", timeout=60)
    items = pdf_items(page.body, symbol)
    joined = " ".join(i["text"] for i in items[:60])
    if title.lower() not in joined.lower():
        raise RuntimeError(f"{symbol}: el documento no contiene «{title}» en su primera página")
    # The body starts at the first article; what precedes it is the document's front matter.
    first = next(i for i, item in enumerate(items) if texts.ART.match(item["text"]))
    heading_before = next((i for i in range(first - 1, max(first - 6, -1), -1) if texts.HEAD.match(items[i]["text"])), first)
    result = texts.structure(items[heading_before:], start=None, sections=True)
    result.pop("trailing")
    return {
        "lang": lang, "title": title,
        "source": {"publisher": "Naciones Unidas", "document": f"{title} ({symbol})", "identifier": symbol, "url": url,
                   "retrieved": page.fetched_at[:10], "sha256": page.sha256, "method": "un-pdf"},
        "versions": [], "preamble": result["preamble"], "nodes": result["nodes"], "final_clauses": result["final_clauses"],
        "authentic_clause": None,
        "quality": texts.check(result, declaration=True),
        "body": body, "kind": kind, "symbol": symbol,
    }


def html_document(instrument_id: str) -> dict:
    url, body, start, title, end = HTML_DOCUMENTS[instrument_id]
    result = src_texts.from_html(url, lang="es", publisher="Organización de los Estados Americanos, Comisión Interamericana de Derechos Humanos",
                                 document=title, start=start, end=end, adapter="oas", breaks=("container", "newline", "unwrap"), declaration=True)
    return {**result, "body": body, "kind": "rules" if "rules" in instrument_id else "statute"}


PDF_DOCUMENTS = {
    # id: (url, lang, body, title, kind, start)
    "au-achpr-rules": ("https://achpr.au.int/sites/default/files/files/2021-04/rulesofprocedure2020eng1.pdf", "en", "au-achpr-commission",
                       "Rules of Procedure of the African Commission on Human and Peoples' Rights", "rules", None),
    "au-afchpr-rules": ("https://www.african-court.org/afchpr/wp-content/uploads/2021/04/Rules-Final-Revised-adopted-Rules-eng-April-2021.pdf", "en", "au-afchpr",
                        "Rules of Court", "rules", None),
}


def pdf_document(instrument_id: str) -> dict:
    url, lang, body, title, kind, start = PDF_DOCUMENTS[instrument_id]
    page = fetch(url, adapter="pdf", timeout=60)
    items = pdf_items(page.body)
    if start is None:
        first = next(i for i, item in enumerate(items) if texts.ART.match(item["text"]))
        heading_before = next((i for i in range(first - 1, max(first - 6, -1), -1) if texts.HEAD.match(items[i]["text"])), first)
        items = items[heading_before:]
    result = texts.structure(items, start=start, sections=kind == "rules")
    result.pop("trailing")
    return {
        "lang": lang, "title": title,
        "source": {"publisher": "Corte Africana de Derechos Humanos y de los Pueblos" if "african-court" in url else "Comisión Africana de Derechos Humanos y de los Pueblos",
                   "document": title, "url": url, "retrieved": page.fetched_at[:10], "sha256": page.sha256, "method": "pdf"},
        "versions": [], "preamble": result["preamble"], "nodes": result["nodes"], "final_clauses": result["final_clauses"],
        "authentic_clause": texts.authentic_languages(result),
        "quality": texts.check(result, declaration=kind == "rules"),
        "body": body, "kind": kind,
    }


# Resolutions quoted by paragraph (they have no articles): kept as numbered paragraphs.
PARAGRAPH_DOCUMENTS = {
    "un-ga-60-251": ("A/RES/60/251", "es", "Consejo de Derechos Humanos", "Resolución aprobada por la Asamblea General el 15 de marzo de 2006"),
}


def paragraph_document(document_id: str) -> dict:
    symbol, lang, title, phrase = PARAGRAPH_DOCUMENTS[document_id]
    url = UNDOCS.format(symbol=symbol, lang=lang)
    page = fetch(url, adapter="undocs", timeout=60)
    items = pdf_items(page.body, symbol)
    if phrase.lower() not in " ".join(i["text"] for i in items[:30]).lower():
        raise RuntimeError(f"{symbol}: no contiene «{phrase}»")
    paragraphs = []
    for item in items:
        number = re.match(r"^(\d+)\.\s", item["text"])
        letter = re.match(r"^([a-z])\)\s", item["text"])
        if number:
            paragraphs.append({"number": number.group(1), "text": item["text"], "items": []})
        elif letter and paragraphs:
            paragraphs[-1]["items"].append({"letter": letter.group(1), "text": item["text"]})
        elif paragraphs and not paragraphs[-1]["items"] and not re.match(r"^[A-ZÁÉÍÓÚ][a-záéíóú]+ndo\b", item["text"]):
            paragraphs[-1]["text"] += " " + item["text"] if not item["text"][:1].isupper() else ""
    return {"id": document_id, "symbol": symbol, "lang": lang, "title": title, "url": url,
            "retrieved": page.fetched_at[:10], "sha256": page.sha256, "paragraphs": paragraphs}
