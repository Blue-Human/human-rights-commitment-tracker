"""Inventory of the official sources of the Atlas (data/atlas/sources.json).

Static facts (institution, address, what it publishes, how the pipeline reads it, the reuse terms the
source states) are listed here; the date of the last check and whether the source answered come from
the run itself.
"""
from __future__ import annotations

from common import DATA, TODAY, fetch_log, write_json

SOURCES = [
    {"id": "untc", "institution": "Naciones Unidas, Oficina de Asuntos Jurídicos (Sección de Tratados)", "name": "Colección de Tratados de las Naciones Unidas",
     "url": "https://treaties.un.org/", "data": "Estado de los tratados depositados ante el Secretario General: firmas, ratificaciones, adhesiones, sucesiones, declaraciones, reservas, objeciones y notas",
     "access": "Páginas públicas del registro (HTML), una por tratado", "adapters": ["untc"], "terms": "Condiciones de uso de las Naciones Unidas (un.org/es/about-us/terms-of-use)",
     "integration": "integrated"},
    {"id": "ohchr-dashboard", "institution": "Oficina del Alto Comisionado de las Naciones Unidas para los Derechos Humanos (ACNUDH)", "name": "Panel de ratificaciones de los 18 instrumentos",
     "url": "https://indicators.ohchr.org/", "data": "Lista de los 18 instrumentos internacionales de derechos humanos que sigue el ACNUDH", "access": "API JSON pública del panel",
     "adapters": ["ohchr-dashboard"], "terms": "Condiciones de uso de las Naciones Unidas", "integration": "integrated"},
    {"id": "tbinternet", "institution": "ACNUDH", "name": "Base de datos de los órganos de tratados (UN Treaty Body Database)",
     "url": "https://tbinternet.ohchr.org/", "data": "Por Estado: fecha de entrada en vigor y aceptación de los procedimientos de comunicaciones individuales, investigación y comunicaciones entre Estados. Observaciones y recomendaciones generales, reglamentos y jurisprudencia",
     "access": "Páginas públicas en español (HTML); búsqueda paginada", "adapters": ["tbinternet"], "terms": "Condiciones de uso de las Naciones Unidas", "integration": "integrated"},
    {"id": "undocs", "institution": "Naciones Unidas", "name": "Sistema de Archivo de Documentos (documents.un.org)",
     "url": "https://documents.un.org/", "data": "Documentos oficiales por símbolo: resoluciones de la Asamblea General y reglamentos de los comités",
     "access": "Descarga pública por símbolo e idioma (PDF)", "adapters": ["undocs", "docs"], "terms": "Condiciones de uso de las Naciones Unidas", "integration": "integrated"},
    {"id": "un.org", "institution": "Naciones Unidas", "name": "Declaración Universal de Derechos Humanos (un.org)",
     "url": "https://www.un.org/es/about-us/universal-declaration-of-human-rights", "data": "Texto de la Declaración Universal en español y en inglés", "access": "Página pública (HTML)",
     "adapters": ["un.org"], "terms": "Condiciones de uso de las Naciones Unidas", "integration": "integrated"},
    {"id": "ohchr", "institution": "ACNUDH", "name": "Sitio web del ACNUDH (ohchr.org)", "url": "https://www.ohchr.org/",
     "data": "Textos de los instrumentos, páginas de los órganos y de sus miembros", "access": "El sitio responde con un control de acceso automatizado (Cloudflare) a las solicitudes del Atlas",
     "adapters": [], "terms": None, "integration": "blocked"},
    {"id": "juris", "institution": "ACNUDH", "name": "Base de datos de jurisprudencia (juris.ohchr.org)", "url": "https://juris.ohchr.org/",
     "data": "Jurisprudencia de los órganos de tratados con artículos examinados y resultado", "access": "Aplicación interactiva sin exportación pública documentada",
     "adapters": [], "terms": None, "integration": "pending"},
    {"id": "uhri", "institution": "ACNUDH", "name": "Índice Universal de los Derechos Humanos", "url": "https://uhri.ohchr.org/",
     "data": "Recomendaciones de los mecanismos de la ONU", "access": "Exportación JSON pública (ya usada por el HRCI para las recomendaciones del EPU a España)",
     "adapters": [], "terms": None, "integration": "reference"},
    {"id": "complaints", "institution": "ACNUDH", "name": "Presentación de comunicaciones a los órganos de tratados", "url": "https://complaints.ohchr.org/",
     "data": "Canal oficial de presentación", "access": "Enlace (el Atlas no envía ni almacena casos)", "adapters": [], "terms": None, "integration": "link"},
    {"id": "spsubmission", "institution": "ACNUDH", "name": "Presentación a los procedimientos especiales", "url": "https://spsubmission.ohchr.org/",
     "data": "Canal oficial de presentación", "access": "Enlace (el Atlas no envía ni almacena casos)", "adapters": [], "terms": None, "integration": "link"},
    {"id": "boe", "institution": "Agencia Estatal Boletín Oficial del Estado (España)", "name": "Boletín Oficial del Estado: textos de los tratados en los que España es parte",
     "url": "https://www.boe.es/", "data": "Texto consolidado por bloques y versiones, o texto publicado en el Diario; instrumento de ratificación y notas sobre España",
     "access": "API de datos abiertos (legislación consolidada) y XML del Diario; buscador de legislación",
     "adapters": ["boe"], "terms": "Reutilización autorizada citando la fuente (aviso legal del BOE y Real Decreto 181/2008)", "integration": "integrated"},
    {"id": "echr", "institution": "Consejo de Europa, Tribunal Europeo de Derechos Humanos", "name": "Sitio del Tribunal y HUDOC",
     "url": "https://www.echr.coe.int/", "data": "Composición del Tribunal; sentencias con los artículos en los que el Tribunal declaró o descartó una violación (HUDOC)",
     "access": "Páginas públicas y API de consulta de HUDOC. Desde el 9 de noviembre de 2026 ambos responden con un control de acceso automatizado: se conserva la última lectura y se reintenta en cada ejecución",
     "adapters": ["echr", "hudoc"], "terms": "Condiciones de uso del Consejo de Europa", "integration": "partial"},
    {"id": "coe-treaties", "institution": "Consejo de Europa, Oficina de Tratados", "name": "Oficina de Tratados (coe.int/conventions)",
     "url": "https://www.coe.int/es/web/conventions", "data": "Estado de firmas y ratificaciones de los convenios del Consejo de Europa",
     "access": "El sitio responde con un control de acceso automatizado (Cloudflare); para España se usa el BOE", "adapters": [], "terms": None, "integration": "blocked"},
    {"id": "oas", "institution": "Organización de los Estados Americanos, Departamento de Derecho Internacional y Comisión Interamericana",
     "name": "Tratados multilaterales interamericanos; documentos básicos de la CIDH", "url": "https://www.oas.org/",
     "data": "Texto de los tratados en español, tablas de firmas y ratificaciones con declaraciones, reservas y denuncias; Estatuto, Reglamento y composición de la CIDH",
     "access": "Páginas públicas (HTML)", "adapters": ["oas"], "terms": "Condiciones de uso de la OEA", "integration": "integrated"},
    {"id": "corteidh", "institution": "Corte Interamericana de Derechos Humanos", "name": "Sitio de la Corte Interamericana", "url": "https://www.corteidh.or.cr/",
     "data": "Estatuto, Reglamento, composición, jurisprudencia", "access": "El sitio responde con un control de acceso automatizado", "adapters": [], "terms": None, "integration": "blocked"},
    {"id": "au", "institution": "Unión Africana", "name": "Tratados de la Unión Africana", "url": "https://au.int/en/treaties",
     "data": "Fechas de adopción y entrada en vigor; listas de firmas y ratificaciones o adhesiones (PDF fechados)", "access": "Páginas y PDF públicos",
     "adapters": ["au"], "terms": None, "integration": "integrated"},
    {"id": "achpr", "institution": "Comisión Africana de Derechos Humanos y de los Pueblos", "name": "Sitio de la Comisión Africana", "url": "https://achpr.au.int/",
     "data": "Texto de la Carta Africana (inglés), miembros de la Comisión, procedimiento de comunicaciones", "access": "Páginas públicas (HTML)",
     "adapters": ["achpr"], "terms": None, "integration": "integrated"},
    {"id": "afchpr", "institution": "Corte Africana de Derechos Humanos y de los Pueblos", "name": "Sitio de la Corte Africana", "url": "https://www.african-court.org/",
     "data": "Lista de declaraciones del artículo 34.6 del Protocolo y sus retiradas", "access": "Página pública (HTML); conexiones a veces lentas",
     "adapters": ["au"], "terms": None, "integration": "partial"},
    {"id": "m49", "institution": "División de Estadística de las Naciones Unidas", "name": "Normas M49 (códigos y nombres de países y zonas)",
     "url": "https://unstats.un.org/unsd/methodology/m49/overview/", "data": "Nombres oficiales en español y códigos ISO 3166", "access": "Página pública (HTML)",
     "adapters": ["m49"], "terms": "Condiciones de uso de las Naciones Unidas", "integration": "integrated"},
    {"id": "ilo", "institution": "Organización Internacional del Trabajo", "name": "NORMLEX", "url": "https://normlex.ilo.org/",
     "data": "Convenios de la OIT y su estado de ratificación", "access": "El sitio responde con un control de acceso automatizado", "adapters": [], "terms": None, "integration": "blocked"},
    {"id": "unesco", "institution": "UNESCO", "name": "Convenciones de la UNESCO", "url": "https://www.unesco.org/en/legal-affairs",
     "data": "Convenciones y su estado", "access": "Páginas públicas; no incorporadas en esta versión", "adapters": [], "terms": None, "integration": "pending"},
]


def write_sources(report: dict) -> None:
    log = fetch_log()
    unavailable = " ".join(u["detail"] for u in report.get("unavailable", []))
    rows = []
    for source in SOURCES:
        fetched = [f for f in log if f.get("adapter") in source["adapters"]]
        checked = max((f.get("checked_at") or f.get("fetched_at") or "" for f in fetched), default=None)
        host_blocked = any(h in unavailable for h in [source["url"].split("/")[2]])
        rows.append({**source, "documents": len({f["url"] for f in fetched}), "last_checked": (checked or "")[:10] or None,
                     "answered_last_run": None if not source["adapters"] else not host_blocked})
    write_json(DATA / "sources.json", {"generated": TODAY, "sources": rows})
