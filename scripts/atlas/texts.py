"""From an official publication to a navigable text: preamble, parts, chapters, articles and their
paragraphs, in the order and with the numbering of the source.

The structurer only recognises the headings the publication itself prints ("PARTE II",
"Artículo 6.", "CAPÍTULO III"); it never rewrites a sentence, merges paragraphs or renumbers. A text
is marked complete only when it passes every integrity check (see `check`); otherwise it is kept out
of the reader and the reason is published instead.
"""
from __future__ import annotations

import re
import unicodedata

from common import fold, one_line

ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def roman(value: str) -> int | None:
    if not re.fullmatch(r"[IVXLC]+", value):
        return None
    total, prev = 0, 0
    for ch in reversed(value):
        n = ROMAN[ch]
        total = total - n if n < prev else total + n
        prev = max(prev, n)
    return total


ART = re.compile(r"^(?:(?:Art[íi]culo|ART[ÍI]CULO|Article|ARTICLE)\s*|(?:Rule|RULE)\s+)(\d+|[IVXLC]+|[A-Z])(?:\s*(bis|ter|quater))?(?=$|[\s.:–—-])\s*[.:–—-]?\s*(.*)$")
HEAD = re.compile(r"^(?:(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|SEPTIMA|OCTAVA|Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|Séptima|Octava)\s+(?:PARTE|parte)|"
                  r"(PARTE|Parte|PART|Part|TÍTULO|Título|TITULO|CAPÍTULO|Capítulo|CAPITULO|CHAPTER|Chapter|SECCIÓN|Sección|SECCION|SECTION|Section|LIBRO)"
                  r"\s+([IVXLC]+|[IVXLCl]{2,}|\d+|[A-Z]|[ÚU]NIC[OA]|PRIMER[OA]|SEGUND[OA]|TERCER[OA]|CUART[OA]|QUINT[OA]))\b\.?\s*[.:–—-]?\s*(.*)$")
ANNEX = re.compile(r"^(ANEXO|Anexo|ANEJO|Anejo|AP[ÉE]NDICE|Ap[ée]ndice|ANNEX|Annex|APPENDIX|Appendix|SCHEDULE|Schedule)\b\s*([IVXLC]+|\d+|[A-Z])?\b\.?\s*[.:–—-]?\s*(.*)$")
PREAMBLE = re.compile(r"^(PRE[ÁA]MBULO|Pre[áa]mbulo|PREAMBLE|Preamble)\.?$")
TESTIMONIUM = re.compile(r"^(Adopted by the|Adoptad[oa] por|EN FE DE LO CUAL|En fe de lo cual|EN TESTIMONIO DE LO CUAL|En testimonio de lo cual|Hecho en|HECHO en|HECHO EN|"
                         r"IN WITNESS WHEREOF|In witness whereof|DONE at|Done at)\b")
# What the gazette prints after a treaty: lists of States, their declarations, the entry into force.
AFTER_LINE = re.compile(r"^(?:RESERVATIONS AND DECLARATIONS.*|Reservations and declarations.*|Información relacionada|\[Información relacionada\]|ESTADOS PARTES?|Estados [Pp]artes?|Lista de Estados( [Pp]artes)?|"
                        r"LISTA DE ESTADOS( PARTES)?|\[Entrada en vigor\]|DECLARACIONES Y RESERVAS|Declaraciones y reservas|"
                        r"RESERVAS Y DECLARACIONES|Reservas y declaraciones|DECLARACIONES|Declaraciones|RESERVAS|Reservas|Estados [Pp]artes? en el [A-Za-z]+)\s*:?\.?\s*$")
AFTER_START = re.compile(r"^(?:©|\[\s*Estado de Firmas|\[\s*Texto del Tratado|Lo que se hace público|(?:La|El) present[e]? .{0,80}entr[óo] en vigor|ESTADO PARTE\b|Estados? que han|"
                         r"\(VER IM[ÁA]GENES|(?:El|Los) [Ii]nstrumentos? de (?:[Aa]dhesi[óo]n|[Rr]atificaci[óo]n|[Aa]ceptaci[óo]n).{0,160}(?:deposit|fue))")


class _After:
    @staticmethod
    def search(line: str) -> bool:
        return bool(AFTER_LINE.match(line) or AFTER_START.match(line))


AFTER_TREATY = _After()
STATE_TABLE = re.compile(r"Estados?|Firma|Ratificaci|Adhesi|Dep[óo]sito|Entrada en vigor|Participante", re.I)
LEVEL = {"parte": 1, "part": 1, "titulo": 1, "libro": 1, "capitulo": 2, "chapter": 2, "seccion": 3, "section": 3}

NUMBER_WORDS = {
    "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciseis": 16, "diecisiete": 17, "dieciocho": 18,
    "diecinueve": 19, "veinte": 20, "veintiun": 21, "veintiuno": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24,
    "veinticinco": 25, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29, "treinta": 30, "cuarenta": 40,
    "cincuenta": 50, "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100, "ciento": 100,
}


def words_to_number(phrase: str) -> int | None:
    """'cincuenta y tres' → 53. Only for the count of articles that a ratification instrument states."""
    total, seen = 0, False
    for word in fold(phrase).replace("-", " ").split():
        if word == "y":
            continue
        if word not in NUMBER_WORDS:
            return None
        total += NUMBER_WORDS[word]
        seen = True
    return total if seen else None


def stated_article_count(paragraphs: list[str]) -> int | None:
    """'Vistos y examinados el Preámbulo y los cincuenta y tres artículos de dicho Pacto' → 53."""
    for text in paragraphs:
        match = re.search(r"(?:vistos?|visto)\s+y\s+examinad[oa]s?.*?\blos\s+([a-záéíóúñ\s-]+?)\s+art[íi]culos", text, re.I)
        if match:
            number = words_to_number(match.group(1))
            if number:
                return number
        match = re.search(r"(?:vistos?|visto)\s+y\s+examinad[oa]s?.*?\blos\s+(\d+)\s+art[íi]culos", text, re.I)
        if match:
            return int(match.group(1))
    return None


def article_number(match) -> tuple[str, int | None]:
    raw, suffix = match.group(1), match.group(2)
    number = raw + (f" {suffix}" if suffix else "")
    # A single capital is read as a letter (the Revised European Social Charter numbers Parts III
    # to VI from A to O, "I" included); roman numerals have two or more characters, or follow "II".
    value = int(raw) if raw.isdigit() else roman(raw) if len(raw) > 1 else None
    return number, value


def node_id(prefix: str, number: str) -> str:
    return f"{prefix}-" + re.sub(r"[^a-z0-9]+", "-", fold(number)).strip("-")


SECTION = re.compile(r"^([IVXLC]+|[A-Z])\.\s+([A-ZÁÉÍÓÚÑ][^.]{2,220})$")


def structure(items: list[dict], *, start: str | None = None, end: str | None = None, stop_names: frozenset = frozenset(),
              headings_beside: bool = False, sections: bool = False) -> dict:
    """`sections`: the publication also divides itself with numbered section titles ("II. Programa",
    "A. Disposiciones generales"), as the rules of procedure of the UN committees do."""
    """Build the text from a flat list of paragraphs ({text, class, history?}). `start` and `end`
    are regular expressions that delimit one instrument inside a publication holding several."""
    # 1. Delimit the instrument.
    if start:
        begin = next((i for i, item in enumerate(items) if item.get("text") and re.search(start, item["text"])), None)
        if begin is None:
            raise RuntimeError(f"No se encuentra el inicio del instrumento ({start})")
        items = items[begin:]
    if end:
        stop = next((i for i, item in enumerate(items) if i and item.get("text") and re.search(end, item["text"])), None)
        items = items[:stop] if stop is not None else items

    title = None
    preamble: list[dict] = []
    nodes: list[dict] = []
    final: list[dict] = []
    trailing: list[dict] = []
    tables_in_body = 0
    state = "title"
    current = None
    pending_heading = None
    last_value = 0
    heading_count = {}
    declaration_style = headings_beside

    def push_heading(kind: str, label: str, text: str | None):
        nonlocal pending_heading
        key = fold(kind)
        level = LEVEL.get(key, 1)
        base = node_id("h", f"{kind}-{label}")
        heading_count[base] = heading_count.get(base, 0) + 1
        hid = base if heading_count[base] == 1 else f"{base}-{heading_count[base]}"
        node = {"kind": "heading", "id": hid, "level": level, "label": label_text(kind, label), "title": text or None}
        nodes.append(node)
        pending_heading = node

    for index, item in enumerate(items):
        text = item.get("text")
        if item.get("class") == "table":
            header = " ".join(" ".join(row) for row in item["rows"][:2])
            if state in ("final", "after") or (nodes and STATE_TABLE.search(header)):
                state = "after"
                trailing.append(item)
            elif current:
                current["paragraphs"].append({"id": f"{current['id']}-p{len(current['paragraphs']) + 1}", "table": item["rows"]})
                tables_in_body += 1
            continue
        if not text:
            continue
        line = one_line(text)
        # Right after an article's number, a line is its heading or its first paragraph, even if it
        # reads like the gazette's closing lists ("Reservas", "Estados Partes.").
        fresh_article = current is not None and not current["paragraphs"]
        if state in ("body", "preamble") and nodes and not fresh_article and (AFTER_TREATY.search(line) or line in stop_names):
            state = "after"
        if state == "after":
            trailing.append(item)
            continue
        if state == "final":
            annex = ANNEX.match(line)
            if annex and not AFTER_TREATY.search(line):
                kind_label = annex.group(2) or ""
                nodes.append({"kind": "heading", "id": node_id("anexo", f"{len([n for n in nodes if n.get('annex')]) + 1}"), "level": 1,
                              "annex": True, "label": one_line(f"{annex.group(1).capitalize()} {kind_label}"), "title": annex.group(3).strip() or None})
                pending_heading = nodes[-1]
                current = None
                last_value = 0
                state = "annex"
                continue
            if AFTER_TREATY.search(line) or line in stop_names or ART.match(line):
                state = "after"
                trailing.append(item)
            else:
                final.append({"text": text})
            continue

        if state == "annex":
            if AFTER_TREATY.search(line) or line in stop_names:
                state = "after"
                trailing.append(item)
                continue
            annex = ANNEX.match(line)
            if annex and pending_heading is not None and not pending_heading.get("title") and not pending_heading.get("text"):
                pending_heading["title"] = line
                continue
            if annex:
                nodes.append({"kind": "heading", "id": node_id("anexo", f"{len([n for n in nodes if n.get('annex')]) + 1}"), "level": 1,
                              "annex": True, "label": one_line(f"{annex.group(1).capitalize()} {annex.group(2) or ''}"), "title": annex.group(3).strip() or None})
                pending_heading = nodes[-1]
                continue
            if pending_heading is not None and not pending_heading["title"] and len(line) <= 160 and not pending_heading.get("text"):
                pending_heading["title"] = line.rstrip(".")
                continue
            if pending_heading is not None:
                pending_heading.setdefault("text", []).append(text)
            continue
        art = ART.match(line)
        head = HEAD.match(line) if not art else None
        if sections and not art and not head and state in ("body", "title", "preamble"):
            section = SECTION.match(line)
            if section:
                level = 3 if len(section.group(1)) == 1 and section.group(1) not in "IVX" else 2
                push_heading("Sección", section.group(1), section.group(2))
                nodes[-1]["label"] = f"{section.group(1)}."
                nodes[-1]["level"] = level
                current = None
                state = "body"
                continue
        if state == "title":
            if art or head or PREAMBLE.match(line):
                state = "body" if art or head else "preamble"
            else:
                if title is None:
                    title = line
                else:
                    preamble.append({"id": f"pre-{len(preamble) + 1}", "text": text})
                    state = "preamble"
                continue
        if PREAMBLE.match(line):
            state = "preamble"
            continue
        # An annex that follows the last article directly (rules of procedure have no final clause).
        annex_line = ANNEX.match(line) if state == "body" and len(line) <= 80 and nodes else None
        if annex_line and not art:
            nodes.append({"kind": "heading", "id": node_id("anexo", f"{len([n for n in nodes if n.get('annex')]) + 1}"), "level": 1,
                          "annex": True, "label": one_line(f"{annex_line.group(1).capitalize()} {annex_line.group(2) or ''}"),
                          "title": annex_line.group(3).strip() or None})
            pending_heading = nodes[-1]
            current = None
            state = "annex"
            continue
        if art:
            number, value = article_number(art)
            # A number lower than the last one after the body has started means the publication
            # has moved on to something else (declarations quoting articles, another treaty).
            if value is not None and last_value and value <= last_value and not art.group(2):
                state = "after"
                trailing.append(item)
                continue
            if value is not None:
                last_value = value
            rest = art.group(3).strip()
            # What follows the number on the same line is the article's heading ("Derecho a la
            # vida"), unless it is already the text: a numbered paragraph ("1. Toda persona..."), or
            # a sentence ("Toda persona tiene derecho a la educación, ...").
            starts_text = re.match(r"^(\d+\.|\(?[a-z]\)|[ivx]+\))\s", rest) or re.match(r"^(Toda|Todo|Nadie|Los|Las|El|La|Every|No one|Everyone|All)\b.{40,}", rest)
            # The BOE prints the number and heading alone in a paragraph of class "articulo".
            sentence = "," in rest and len(rest) > 60 and (item.get("class") or "").lower() not in ("articulo", "capitulo", "rbf_sfranysig_articulo", "rbc_red_centro")
            heading = rest.rstrip(".") if rest and len(rest) <= 160 and not starts_text and not sentence and not declaration_style else None
            current = {"kind": "article", "id": node_id("art", number), "number": number, "label": f"Artículo {number}",
                       "heading": heading or None, "paragraphs": []}
            if item.get("history"):
                current["history"] = item["history"]
            if item.get("current_version"):
                current["version"] = item["current_version"]
            if item.get("notes"):
                current["notes"] = item["notes"]
            if item.get("block"):
                current["block"] = item["block"]
            if rest and not heading:
                current["paragraphs"].append({"id": f"{current['id']}-p1", "text": rest})
            nodes.append(current)
            state = "body"
            pending_heading = None
            continue
        if head:
            ordinal, kind, label, rest = head.group(1), head.group(2), head.group(3), head.group(4)
            if ordinal:
                kind, label, rest = "Parte", ordinal.capitalize(), head.group(4)
            push_heading(kind, label, rest.strip() or None)
            current = None
            state = "body"
            continue
        if TESTIMONIUM.match(line) and state == "body":
            state = "final"
            final.append({"text": text})
            current = None
            continue
        if state == "preamble":
            preamble.append({"id": f"pre-{len(preamble) + 1}", "text": text})
            continue
        # A short line right after a heading is its title ("PARTE II" / "Derechos y libertades").
        if pending_heading is not None and current is None:
            if not pending_heading["title"] and len(line) <= 160:
                pending_heading["title"] = line.rstrip(".")
                continue
        if current is None:
            # Text between a heading and the next article: an unnumbered provision. Kept with the
            # heading so nothing is lost.
            if pending_heading is not None:
                pending_heading.setdefault("text", []).append(text)
                continue
            preamble.append({"id": f"pre-{len(preamble) + 1}", "text": text})
            continue
        # Where the publication prints each article's heading in a column beside it, the heading
        # comes after the article's text in reading order (American Declaration: "Artículo I. Todo
        # ser humano..." / "Derecho a la vida, a la libertad..."). It is the heading of that article.
        following = next((x.get("text") for x in items[index + 1:index + 2] if x.get("text")), "") or ""
        if declaration_style and current["paragraphs"] and not current["heading"] and len(line) <= 120 \
                and (not following or ART.match(one_line(following)) or HEAD.match(one_line(following))) \
                and not re.search(r"[;:,]\s*$", line) and line[:1].isupper():
            current["heading"] = line.rstrip(".")
            continue
        # A line in capitals that is not a sentence is a subheading of the publication
        # ("COMMUNICATION FROM STATES"); it opens a new section.
        if current["paragraphs"] and line.isupper() and len(line) <= 80 and not re.search(r"[.;:]\s*$", line) and len(line.split()) >= 2:
            push_heading("Sección", "", line)
            nodes[-1]["label"] = line
            nodes[-1]["title"] = None
            nodes[-1]["level"] = 3
            current = None
            continue
        # A short line without final punctuation right after the number is the article's heading
        # when the publication prints it on its own line ("Artículo 1" / "Obligación de Adoptar Medidas").
        if not declaration_style and not current["paragraphs"] and not current["heading"] and len(line) <= 100 and not re.search(r"[.;:,]\s*$", line) \
                and line[:1].isupper() and not re.match(r"^(\d+\.|[a-z]\)|\([a-z]\))", line) \
                and not re.match(r"^(Todo|Toda|Todos|Todas|Los|Las|El|La|Lo|Nadie|Cada|Ningun[oa]?|En|Para|Con|Si|Cuando|Every|No|All|The|Each|Any|In|States)\b", line) \
                and not following[:1].islower():
            current["heading"] = line
            continue
        current["paragraphs"].append({"id": f"{current['id']}-p{len(current['paragraphs']) + 1}", "text": text})

    for node in nodes:
        if node["kind"] == "article":
            for paragraph in node["paragraphs"]:
                label = re.match(r"^(\d+)\.\s", paragraph.get("text", ""))
                if label:
                    paragraph["number"] = label.group(1)
    return {"title": title, "preamble": preamble, "nodes": nodes, "final_clauses": final, "trailing": trailing,
            "tables_in_body": tables_in_body}


def label_text(kind: str, label: str) -> str:
    kind_folded = fold(kind)
    names = {"parte": "Parte", "part": "Part", "titulo": "Título", "capitulo": "Capítulo", "chapter": "Chapter",
             "seccion": "Sección", "section": "Section", "libro": "Libro"}
    return f"{names.get(kind_folded, kind.capitalize())} {label}"


def check(result: dict, *, stated: int | None = None, declaration: bool = False, exempt: dict | None = None) -> dict:
    """Integrity checks. The text is complete only if all of them pass."""
    articles = [n for n in result["nodes"] if n["kind"] == "article"]
    checks = []

    numbers = [n["number"] for n in articles]
    duplicates = sorted({x for x in numbers if numbers.count(x) > 1})
    checks.append({"check": "sin_duplicados", "ok": not duplicates, "detail": ", ".join(duplicates) or None})

    # Numbering: each run of arabic (or roman) numbers must go up by one. Lettered articles (the
    # Revised European Social Charter's Part V, A to O) must follow the alphabet.
    def seq_ok(values):
        return all(b == a + 1 for a, b in zip(values, values[1:]))
    numeric = [int(n["number"]) for n in articles if n["number"].isdigit()]
    singles = [n["number"] for n in articles if re.fullmatch(r"[A-Z]", n["number"])]
    lettered = any(x not in "IVXLC" for x in singles)
    romans = [roman(n["number"]) for n in articles if re.fullmatch(r"[IVXLC]{2,}", n["number"]) or (not lettered and n["number"] in singles)]
    letters = singles if lettered else []
    sequence = seq_ok(numeric) and (numeric[:1] in ([1], [])) and seq_ok([r for r in romans if r]) and \
        all(ord(b) == ord(a) + 1 for a, b in zip(letters, letters[1:]))
    checks.append({"check": "numeracion_consecutiva", "ok": bool(articles) and sequence,
                   "detail": f"{len(articles)} artículos ({numbers[0]}–{numbers[-1]})" if articles else "sin artículos"})

    if stated:
        total = len(articles)
        checks.append({"check": "recuento_declarado", "ok": total == stated,
                       "detail": f"el instrumento declara {stated}; extraídos {total}"})

    empty = [n["number"] for n in articles if not n["paragraphs"]]
    checks.append({"check": "articulos_con_texto", "ok": not empty, "detail": ", ".join(empty) or None})

    # Annexes are part of the treaty: one without any text means the extraction lost it.
    hollow = [n["label"] for n in result["nodes"] if n.get("annex") and not n.get("text") and not n.get("title")]
    checks.append({"check": "anexos_con_texto", "ok": not hollow, "detail": ", ".join(hollow) or None})

    paragraphs = [p["text"] for n in articles for p in n["paragraphs"] if p.get("text")]
    long = [p for p in paragraphs if len(p) > 60]
    upper = [p for p in long if p.upper() == p]
    checks.append({"check": "sin_texto_en_mayusculas", "ok": len(upper) <= max(1, len(long) // 50),
                   "detail": f"{len(upper)} de {len(long)} párrafos largos en mayúsculas" if upper else None})

    suspicious = []
    for p in paragraphs:
        suspicious += re.findall(r"\b[a-záéíóúñü]+\d+[a-záéíóúñü]+\b", p)
        suspicious += re.findall(r"(?:^|\n)l\.\s", p)
    checks.append({"check": "sin_errores_de_reconocimiento", "ok": len(suspicious) == 0,
                   "detail": ", ".join(sorted(set(suspicious))[:8]) or None})

    # The text must reach the end of the treaty: its last article is a final clause (deposit,
    # registration, entry into force, denunciation, notifications, amendment, authentic texts).
    # Declarations, which have no final clauses, are exempt.
    if articles and not declaration:
        last = " ".join(p.get("text", "") for n in articles[-5:] for p in n["paragraphs"])
        final_words = (r"deposit|registr|en vigor|denuncia|ratificaci|adhesi|Secretari[oa] General|notific|enmienda|aut[ée]ntic|reserva|"
                       r"anejo|anexo|parte integrante|entry into force|denunciation|ratification|accession|Secretary.General|notif|amend|authentic|reservation|annex")
        found = bool(re.search(final_words, last, re.I))
        checks.append({"check": "termina_con_clausulas_finales", "ok": found,
                       "detail": None if found else f"el artículo {articles[-1]['number']} no es una cláusula final"})

    # No article may end in the middle of a sentence (a sign of a cut text).
    # A documented exception (`exempt`, article → reason) covers an article that the source itself
    # prints without a final stop; it is published with the reason.
    exempt = exempt or {}
    cut = [n["number"] for n in articles if n["paragraphs"] and n["paragraphs"][-1].get("text")
           and not re.search(r"[.;:)»\"”’'!?\]]\s*$", n["paragraphs"][-1]["text"]) and n["number"] not in exempt]
    checks.append({"check": "articulos_completos", "ok": not cut, "detail": ", ".join(cut[:10]) or None,
                   **({"exceptions": [{"article": k, "reason": v} for k, v in exempt.items()]} if exempt else {})})

    # The text is spread over its articles: fewer than three articles, or one article holding most
    # of the text, means the publication was not cut where each article starts.
    sizes = [sum(len(p.get("text", "")) for p in n["paragraphs"]) for n in articles]
    spread = len(articles) >= 3 and (declaration or len(articles) < 6 or max(sizes) <= 0.5 * sum(sizes))
    checks.append({"check": "articulos_bien_separados", "ok": spread, "detail": None if spread else f"{len(articles)} artículos"})

    replacement = sum(p.count("�") for p in paragraphs)
    checks.append({"check": "codificacion", "ok": replacement == 0, "detail": f"{replacement} caracteres ilegibles" if replacement else None})

    return {"articles": len(articles), "stated_articles": stated, "checks": checks, "complete": all(c["ok"] for c in checks)}


def authentic_languages(result: dict) -> dict | None:
    """The clause of the treaty that names its authentic texts, quoted from the treaty itself."""
    candidates = [n for n in result["nodes"] if n["kind"] == "article"][-6:]
    for node in reversed(candidates):
        for paragraph in node["paragraphs"]:
            text = paragraph.get("text", "")
            if re.search(r"igualmente\s+aut[ée]ntic|son\s+aut[ée]ntic|equally\s+authentic|ambos\s+textos", text, re.I):
                return {"article": node["number"], "paragraph": paragraph["id"], "text": text}
    for clause in result["final_clauses"]:
        if re.search(r"aut[ée]ntic|authentic|en franc[ée]s e ingl[ée]s|in English and French", clause["text"], re.I):
            return {"article": None, "paragraph": None, "text": clause["text"]}
    return None


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
