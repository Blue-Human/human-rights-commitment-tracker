"""Boletín Oficial del Estado: the Spanish text of the treaties Spain is a party to.

The BOE open data API (www.boe.es/datosabiertos) serves the consolidated text of each international
agreement as typed blocks (heading, preamble, article, annex...), each with the dated versions the
BOE has published. The adapter keeps that structure as it is: it does not renumber, merge or
reword anything. The block of Spain's instrument of ratification is kept apart from the treaty.
"""
from __future__ import annotations

import json
import re
from urllib.parse import quote

import xml.etree.ElementTree as ET

from common import clean, fetch, fold, one_line, source_ref

API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada"


SEARCH = "https://www.boe.es/buscar/legislacion_ava.php"


def search_titles(words: str) -> list[dict]:
    """The BOE legislation search, restricted to the rank "Acuerdo Internacional" (1180). It covers
    every published agreement, while the consolidated-text search only covers the consolidated ones."""
    from urllib.parse import urlencode
    params = urlencode({"campo[3]": "TITULOS", "dato[3]": words, "operador[3]": "and", "campo[4]": "ID_RNGS", "dato[4]": "1180",
                        "accion": "Buscar", "page_hits": "100"})
    page = fetch(f"{SEARCH}?{params}", adapter="boe")
    html_text = page.text()
    results = []
    for item in re.findall(r'<li class="resultado-busqueda[^"]*">(.*?)</li>', html_text, flags=re.S):
        identifier = re.search(r"BOE-A-\d{4}-\d+", item)
        title = re.search(r'<p>(.*?)</p>', item, flags=re.S)
        if identifier and title:
            results.append({"identificador": identifier.group(0), "titulo": one_line(re.sub(r"<[^>]+>", " ", title.group(1)))})
    return results


def search(phrase: str) -> list[dict]:
    query = json.dumps({"query": {"query_string": {"query": f'titulo:("{phrase}")'}}}, ensure_ascii=False)
    url = f"{API}?query={quote(query)}&limit=100"
    page = fetch(url, headers={"Accept": "application/json"}, adapter="boe")
    data = json.loads(page.text()).get("data") or []
    return [d for d in data if d.get("rango", {}).get("texto") == "Acuerdo Internacional"]


def find(phrase: str, pinned: str | None = None, exclude: tuple[str, ...] = ()) -> dict:
    """The single international agreement whose title contains the phrase. Ambiguity is an error
    to be settled by pinning the identifier in the catalogue (after checking its title)."""
    candidates = search_titles(phrase)
    if pinned:
        match = [c for c in candidates if c["identificador"] == pinned]
        if not match:
            raise RuntimeError(f"BOE: {pinned} no aparece al buscar «{phrase}»")
        return match[0]
    wanted = fold(phrase)
    hits = [c for c in candidates if wanted in fold(c["titulo"]) and not any(fold(x) in fold(c["titulo"]) for x in exclude)]
    if len(hits) != 1:
        listing = "\n".join(f"  {c['identificador']} {c['titulo']}" for c in hits)
        raise RuntimeError(f"BOE: «{phrase}» da {len(hits)} resultados:\n{listing}")
    return hits[0]


def _text_of(node) -> str:
    # "[encabezado]" and similar bracketed words are markers of the BOE's editing tool, not text.
    return clean(re.sub(r"\[(?:encabezado|precepto|bloque)\]", "", "".join(node.itertext()), flags=re.I))


def paragraphs(container) -> list[dict]:
    """The paragraphs of a BOE XML container (a block version, or the <texto> of a gazette issue),
    with the class the BOE gives each one."""
    out = []
    for node in list(container):
        tag = node.tag.lower()
        if tag == "table":
            rows = [[one_line("".join(td.itertext())) for td in tr if td.tag.lower() in ("td", "th")] for tr in node.iter() if tr.tag.lower() == "tr"]
            out.append({"class": "table", "rows": rows})
        elif tag == "blockquote":
            for p in node.iter("p"):
                out.append({"class": (p.get("class") or "") + " cita", "text": _text_of(p)})
        elif tag == "p":
            text = _text_of(node)
            if text:
                out.append({"class": node.get("class") or "", "text": text})
        elif tag in ("div", "section"):
            out.extend(paragraphs(node))
    return out


def text(boe_id: str) -> dict:
    """All blocks with all their versions, oldest first, as published."""
    url = f"{API}/id/{boe_id}/texto"
    page = fetch(url, headers={"Accept": "application/xml"}, adapter="boe")
    root = ET.fromstring(page.body)
    status = root.findtext("status/code")
    if status != "200":
        raise RuntimeError(f"BOE {boe_id}: el texto consolidado no está disponible ({status})")
    blocks = []
    for block in root.iter("bloque"):
        versions = [{
            "norm": version.get("id_norma"),
            "published": _iso(version.get("fecha_publicacion")),
            "in_force": _iso(version.get("fecha_vigencia")),
            "paragraphs": paragraphs(version),
        } for version in block.findall("version")]
        blocks.append({"id": block.get("id"), "type": block.get("tipo"), "title": block.get("titulo"), "versions": versions})
    meta_url = f"{API}/id/{boe_id}/metadatos"
    meta_page = fetch(meta_url, headers={"Accept": "application/json"}, adapter="boe")
    meta = json.loads(meta_page.text()).get("data") or {}
    if isinstance(meta, list):
        meta = meta[0] if meta else {}
    return {"id": boe_id, "method": "boe-consolidated", "blocks": blocks, "meta": meta, "ref": source_ref("boe", url, page),
            "meta_ref": source_ref("boe", meta_url, meta_page)}


def gazette(boe_id: str) -> dict:
    """The document as published in the daily gazette: its metadata and the paragraphs of <texto>."""
    url = f"https://www.boe.es/diario_boe/xml.php?id={boe_id}"
    page = fetch(url, adapter="boe")
    root = ET.fromstring(page.body)
    meta = {child.tag: one_line("".join(child.itertext())) for child in root.find("metadatos")}
    texto = root.find("texto")
    return {"id": boe_id, "method": "boe-gazette", "meta": meta, "paragraphs": paragraphs(texto) if texto is not None else [],
            "ref": source_ref("boe", url, page)}


def consolidated_available(boe_id: str) -> bool:
    url = f"{API}/id/{boe_id}/texto/indice"
    page = fetch(url, headers={"Accept": "application/xml"}, adapter="boe", accept=(404,))
    return page.status == 200 and ET.fromstring(page.body).findtext("status/code") == "200"


def _iso(value: str | None) -> str | None:
    return f"{value[:4]}-{value[4:6]}-{value[6:8]}" if value and re.fullmatch(r"\d{8}", value) else None


def human_url(boe_id: str) -> str:
    return f"https://www.boe.es/buscar/act.php?id={boe_id}"
