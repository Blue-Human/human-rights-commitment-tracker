"""Word-for-word quotations of provisions, resolved from the texts in data/atlas/texts.

A curated record never holds the wording of a provision: it names it (instrument, article and,
optionally, paragraph) and gives a short phrase that the provision must contain. The quotation is
read from the official text here, and a reference whose phrase is not found is an error: a wrong
article number cannot reach the site.
"""
from __future__ import annotations

import re

from common import DATA, fold, read_json

_cache: dict = {}


def text_of(instrument: str, lang: str = "es") -> dict | None:
    key = (instrument, lang)
    if key not in _cache:
        _cache[key] = read_json(DATA / "texts" / f"{instrument}.{lang}.json")
    return _cache[key]


def available_lang(instrument: str) -> str | None:
    for lang in ("es", "en"):
        if text_of(instrument, lang):
            return lang
    return None


def _split(paragraphs: list[dict]) -> list[str]:
    out = []
    for p in paragraphs:
        out.extend(x for x in (p.get("text") or "").split("\n") if x.strip())
    return out


def resolve(ref: dict) -> dict:
    """{"i": instrument, "a": article, "p": "2" | "2.b" | "b" | None, "x": phrase}. Returns the ref with
    the quotation, the language of the text and the anchor of the article; or with "error"."""
    instrument, article, part, phrase = ref["i"], str(ref["a"]), ref.get("p"), ref.get("x")
    out = {k: v for k, v in ref.items()}
    lang = available_lang(instrument)
    if not lang:
        out["quote"] = None
        out["unavailable"] = "El texto de este instrumento no está incorporado (no hay una versión digital fiable)."
        return out
    text = text_of(instrument, lang)
    node = next((n for n in text["nodes"] if n["kind"] == "article" and n["number"] == article), None)
    if not node:
        out["error"] = f"{instrument}: no existe el artículo {article}"
        return out
    lines = _split(node["paragraphs"])
    selected = lines
    if part:
        number, _, letter = str(part).partition(".")
        if number.isdigit():
            start = next((i for i, l in enumerate(lines) if re.match(rf"^{number}\.\s", l)), None)
            if start is None:
                out["error"] = f"{instrument} art. {article}: no hay apartado {number}"
                return out
            end = next((i for i in range(start + 1, len(lines)) if re.match(r"^\d+\.\s", lines[i])), len(lines))
            selected = lines[start:end]
        else:
            letter = number
        if letter:
            start = next((i for i, l in enumerate(selected) if re.match(rf"^{re.escape(letter)}\)\s", l)), None)
            if start is None:
                out["error"] = f"{instrument} art. {article}: no hay letra {letter})"
                return out
            end = next((i for i in range(start + 1, len(selected)) if re.match(r"^([a-z]\)|\d+\.)\s", selected[i])), len(selected))
            selected = selected[start:end]
    quote = "\n".join(selected)
    if phrase and fold(phrase) not in fold(quote):
        out["error"] = f"{instrument} art. {article}{' ' + part if part else ''}: la cita no contiene «{phrase}»"
        return out
    out.update({"quote": quote, "lang": lang, "anchor": node["id"], "heading": node.get("heading"),
                "source": {k: text["source"].get(k) for k in ("publisher", "identifier", "url", "retrieved")}})
    return out


def resolve_doc(ref: dict) -> dict:
    """{"doc": document id, "p": "5" | "5.e", "x": phrase} against data/atlas/documents/<id>.json."""
    out = dict(ref)
    doc = read_json(DATA / "documents" / f"{ref['doc']}.json")
    if not doc:
        out["error"] = f"documento {ref['doc']} no disponible"
        return out
    number, _, letter = str(ref["p"]).partition(".")
    paragraph = next((p for p in doc["paragraphs"] if p["number"] == number), None)
    if not paragraph:
        out["error"] = f"{doc['symbol']}: no hay párrafo {number}"
        return out
    quote = paragraph["text"]
    if letter:
        item = next((i for i in paragraph["items"] if i["letter"] == letter), None)
        if not item:
            out["error"] = f"{doc['symbol']}: no hay letra {letter}) en el párrafo {number}"
            return out
        quote = f"{paragraph['text']}\n{item['text']}"
    if ref.get("x") and fold(ref["x"]) not in fold(quote):
        out["error"] = f"{doc['symbol']} párr. {ref['p']}: la cita no contiene «{ref['x']}»"
        return out
    out.update({"quote": quote, "lang": doc["lang"], "source": {"publisher": "Naciones Unidas", "identifier": doc["symbol"], "url": doc["url"],
                                                                "retrieved": doc["retrieved"]}, "document_title": doc["title"]})
    return out
