"""Shared pieces of the Human Rights Atlas ingestion pipeline.

Every adapter fetches official documents through `fetch`, which keeps a local cache (so a run can
be repeated without hitting the sources again), waits between requests to the same host, and logs
each retrieval with its date and SHA-256 fingerprint. Nothing here interprets legal content.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "atlas"
CACHE = ROOT / ".cache" / "atlas"
USER_AGENT = "HRCI-Atlas/1.0 (Blue Human, Human Rights Commitment Institute; +https://human-rights-commitment-tracker.vercel.app/rights)"
# Seconds between two requests to the same host.
POLITENESS = 1.0

TODAY = date.today().isoformat()
_last_request: dict[str, float] = {}
_fetch_log: list[dict] = []
_refresh = "--refresh" in sys.argv


@dataclass
class Fetched:
    url: str
    status: int
    body: bytes
    content_type: str
    sha256: str
    # The date this exact content (same SHA-256) was first retrieved. Kept across refreshes, so
    # an unchanged source does not rewrite the data files; the last check is in `checked_at`.
    fetched_at: str
    from_cache: bool
    checked_at: str = ""

    def text(self, encoding: str | None = None) -> str:
        if encoding:
            return self.body.decode(encoding, errors="replace")
        match = re.search(r"charset=([\w-]+)", self.content_type or "", re.I)
        if match:
            try:
                return self.body.decode(match.group(1))
            except (LookupError, UnicodeDecodeError):
                pass
        try:
            return self.body.decode("utf-8")
        except UnicodeDecodeError:
            return self.body.decode("windows-1252", errors="replace")


class SourceUnavailable(RuntimeError):
    """The source answered with an error, a challenge page or nothing at all."""


def _cache_path(url: str, method: str, payload: dict | None) -> Path:
    key = hashlib.sha1(f"{method} {url} {json.dumps(payload, sort_keys=True) if payload else ''}".encode()).hexdigest()
    return CACHE / key[:2] / key


def fetch(url: str, *, method: str = "GET", data: dict | None = None, headers: dict | None = None,
          adapter: str = "", refresh: bool | None = None, timeout: int = 90, accept: tuple[int, ...] = ()) -> Fetched:
    """Retrieve a public document. Challenge pages (Cloudflare and similar) are reported as
    unavailable: the pipeline never tries to get past an access control."""
    refresh = _refresh if refresh is None else refresh
    path = _cache_path(url, method, data)
    meta_path = path.with_suffix(".json")
    if not refresh and path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text())
        body = path.read_bytes()
        result = Fetched(url, meta["status"], body, meta.get("content_type", ""), meta["sha256"], meta["fetched_at"], True,
                         meta.get("checked_at", meta["fetched_at"]))
        _fetch_log.append({"url": url, "method": method, "status": result.status, "sha256": result.sha256,
                           "bytes": len(body), "fetched_at": result.fetched_at, "checked_at": result.checked_at,
                           "adapter": adapter, "cached": True})
        return result
    previous = json.loads(meta_path.read_text()) if meta_path.exists() else None

    host = urlparse(url).netloc
    wait = POLITENESS - (time.monotonic() - _last_request.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    request_headers = {"User-Agent": USER_AGENT, "Accept-Language": "es,en;q=0.8"}
    request_headers.update(headers or {})
    last_error = None
    for attempt in range(3):
        try:
            response = requests.request(method, url, data=data, headers=request_headers, timeout=timeout)
            break
        except requests.RequestException as error:  # network hiccup: retry twice
            last_error = error
            time.sleep(5 * (attempt + 1))
    else:
        raise SourceUnavailable(f"{url}: {last_error}")
    _last_request[host] = time.monotonic()
    body = response.content
    if response.status_code in (403, 429, 503) and (b"challenge" in body[:20000].lower() or b"cloudflare" in body[:20000].lower()):
        raise SourceUnavailable(f"{url}: protegido por un control de acceso automatizado (HTTP {response.status_code})")
    if response.status_code >= 400 and response.status_code not in accept:
        raise SourceUnavailable(f"{url}: HTTP {response.status_code}")
    digest = hashlib.sha256(body).hexdigest()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    fetched_at = previous["fetched_at"] if previous and previous.get("sha256") == digest else now
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    meta_path.write_text(json.dumps({"url": url, "status": response.status_code, "content_type": response.headers.get("content-type", ""),
                                     "sha256": digest, "fetched_at": fetched_at, "checked_at": now}))
    result = Fetched(url, response.status_code, body, response.headers.get("content-type", ""), digest, fetched_at, False, now)
    _fetch_log.append({"url": url, "method": method, "status": result.status, "sha256": digest, "bytes": len(body),
                       "fetched_at": fetched_at, "checked_at": now, "adapter": adapter, "cached": False,
                       "changed": bool(previous and previous.get("sha256") != digest)})
    return result


def fetch_log() -> list[dict]:
    return list(_fetch_log)


def clean(text: str | None) -> str:
    """Collapse whitespace and decode entities. Never changes words, numbering or punctuation."""
    if text is None:
        return ""
    text = unescape(text).replace(" ", " ").replace("\r", "")
    return re.sub(r"[ \t\f\v]+", " ", re.sub(r"\s*\n\s*", "\n", text)).strip()


def one_line(text: str | None) -> str:
    return re.sub(r"\s+", " ", clean(text)).strip()


def fold(text: str) -> str:
    """Lower case without accents, for matching names across sources."""
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(text)).strip("-")


EN_MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
ES_MONTHS = {m: i + 1 for i, m in enumerate(["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"])}
ES_MONTH_NAMES = {m: i + 1 for i, m in enumerate(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
                                                   "septiembre", "octubre", "noviembre", "diciembre"])}


def en_date(text: str) -> str | None:
    """'24 Jan 1983' or '24 January 1983' → '1983-01-24'."""
    match = re.search(r"(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})", text or "")
    if not match:
        return None
    month = EN_MONTHS.get(match.group(2).lower())
    return f"{match.group(3)}-{month:02d}-{int(match.group(1)):02d}" if month else None


def es_short_date(text: str) -> str | None:
    """'03 ene. 1994' → '1994-01-03' (the format of the OHCHR treaty body database in Spanish)."""
    match = re.search(r"(\d{1,2})\s+([a-zé]{3})\.?\s+(\d{4})", (text or "").lower())
    if not match:
        return None
    month = ES_MONTHS.get(match.group(2))
    return f"{match.group(3)}-{month:02d}-{int(match.group(1)):02d}" if month else None


def write_json(path: Path, value) -> bool:
    """Write only when the content changes, so a repeated run leaves the files (and git) untouched.
    Returns True when the file changed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, ensure_ascii=False, indent=1) + "\n"
    if path.exists() and path.read_text() == text:
        return False
    path.write_text(text)
    return True


def read_json(path: Path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def source_ref(source_id: str, url: str, fetched: Fetched | None = None, locator: str | None = None, **extra) -> dict:
    ref = {"source": source_id, "url": url}
    if fetched:
        ref["retrieved"] = fetched.fetched_at[:10]
        ref["sha256"] = fetched.sha256
    if locator:
        ref["locator"] = locator
    ref.update({k: v for k, v in extra.items() if v is not None})
    return ref


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def env_flag(name: str) -> bool:
    return os.environ.get(name, "") not in ("", "0", "false")
