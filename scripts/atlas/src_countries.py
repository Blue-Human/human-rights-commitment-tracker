"""States and other participants.

Names come from the UN Statistics Division's M49 standard (unstats.un.org), which publishes the
official short name of each country or area in the six UN languages with its ISO 3166 codes.
Each depositary names participants in its own way; the alias table below only records how a
register spells a name that M49 spells differently. It never adds a participant: a register entry
that matches nothing is reported, and a participant that M49 does not list (the European Union, a
State that no longer exists, the Sahrawi Arab Democratic Republic in the African Union register)
is kept as the register names it, outside the list of countries.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from common import fetch, fold, one_line, source_ref

M49 = "https://unstats.un.org/unsd/methodology/m49/overview/"

# Register spelling → ISO 3166 alpha-3, where it differs from the M49 English name.
ALIASES = {
    "bahamas (the)": "BHS", "bahamas": "BHS", "bolivia (plurinational state of)": "BOL", "bolivia": "BOL",
    "cabo verde": "CPV", "cape verde": "CPV", "czech republic": "CZE", "czechia": "CZE",
    "democratic people's republic of korea": "PRK", "democratic republic of the congo": "COD", "democratic rep. of congo": "COD",
    "gambia": "GMB", "gambia (the)": "GMB", "iran (islamic republic of)": "IRN", "lao people's democratic republic": "LAO",
    "micronesia (federated states of)": "FSM", "netherlands (kingdom of the)": "NLD", "netherlands": "NLD",
    "republic of korea": "KOR", "republic of moldova": "MDA", "russian federation": "RUS",
    "st. kitts and nevis": "KNA", "saint kitts and nevis": "KNA", "st. lucia": "LCA", "saint lucia": "LCA",
    "st. vincent and the grenadines": "VCT", "saint vincent and the grenadines": "VCT", "sao tome and principe": "STP",
    "sao tome & principe": "STP", "syrian arab republic": "SYR", "türkiye": "TUR", "turkey": "TUR",
    "united kingdom of great britain and northern ireland": "GBR", "united republic of tanzania": "TZA",
    "united states of america": "USA", "venezuela (bolivarian republic of)": "VEN", "venezuela": "VEN",
    "viet nam": "VNM", "state of palestine": "PSE", "holy see": "VAT", "côte d'ivoire": "CIV", "cote d'ivoire": "CIV",
    "côte d’ivoire": "CIV", "côte d`ivoire": "CIV", "north macedonia": "MKD", "eswatini": "SWZ", "nauru": "NRU", "naoero": "NRU",
    "cook islands": "COK", "niue": "NIU", "central african rep.": "CAF", "central african republic": "CAF",
    "tanzania": "TZA", "libya": "LBY", "egypt": "EGY", "guinea-bissau": "GNB", "equatorial guinea": "GNQ",
    "republic of the congo": "COG", "congo": "COG", "mauritius": "MUS", "somalia": "SOM", "sudan": "SDN",
    "south sudan": "SSD", "sahrawi arab democratic republic": None, "european union": None,
    # Spanish spellings of the OHCHR treaty body database and the OAS tables.
    "bolivia (estado plurinacional)": "BOL", "paises bajos": "NLD", "republica checa": "CZE", "republica de naoero": "NRU",
    "union europea": None, "estados unidos": "USA", "bahamas (commonwealth de las)": "BHS", "bahamas (commonwealth": "BHS",
    "dominica (commonwealth de)": "DMA", "san kitts y nevis": "KNA", "st. kitts y nevis": "KNA", "trinidad & tobago": "TTO",
    "trinidad y tobago": "TTO", "swaziland": "SWZ",
    # Entities that are no longer participants in their own name, or are not States.
    "yugoslavia (former)": None, "republica federal de yugoslavia (serbia y montenegro)": None,
    "mision de administracion provisional de las naciones unidas en kosovo": None,
}


def load_m49() -> tuple[list[dict], dict]:
    page = fetch(M49, adapter="m49")
    soup = BeautifulSoup(page.text(), "html.parser")
    tables = {}
    for lang in ("EN", "ES"):
        table = soup.find("table", id=f"downloadTable{lang}")
        rows = table.find_all("tr")
        head = [one_line(c.get_text()) for c in rows[0].find_all(["td", "th"])]
        tables[lang] = {}
        for row in rows[1:]:
            cells = [one_line(c.get_text()) for c in row.find_all(["td", "th"])]
            record = dict(zip(head, cells))
            if record.get("ISO-alpha3 Code"):
                tables[lang][record["ISO-alpha3 Code"]] = record
    countries = []
    for iso3, en in tables["EN"].items():
        es = tables["ES"].get(iso3, {})
        countries.append({
            "iso3": iso3,
            "iso2": en.get("ISO-alpha2 Code") or None,
            "m49": en.get("M49 Code"),
            "name_es": es.get("Country or Area") or None,
            "name_en": en.get("Country or Area"),
            "region_es": es.get("Region Name") or None,
            "subregion_es": es.get("Sub-region Name") or None,
            "intermediate_region_es": es.get("Intermediate Region Name") or None,
        })
    return countries, source_ref("m49", M49, page)


class Resolver:
    """Turns a register's spelling of a participant into an ISO alpha-3 code."""

    def __init__(self, countries: list[dict]):
        self.by_name = {}
        for country in countries:
            for name in (country["name_en"], country["name_es"]):
                if name:
                    self.by_name[fold(name)] = country["iso3"]
        self.unmatched: dict[str, set] = {}
        self.repaired: dict[str, dict] = {}

    def __call__(self, name: str, register: str) -> str | None:
        key = fold(one_line(name)).strip(" *")
        if not key:
            return None
        if key in ALIASES:
            return ALIASES[key]
        if key in self.by_name:
            return self.by_name[key]
        # Some registers print a name with an unreadable character ("M\ufffdxico") or cut by the
        # width of a column ("San Vicente y las"). Such a name is identified only when exactly one
        # official name fits it; otherwise it stays unmatched.
        if "\ufffd" in key or len(key) >= 12:
            pattern = re.compile("^" + re.escape(key).replace("\ufffd", ".") + ("$" if "\ufffd" in key else ""))
            hits = {iso for n, iso in self.by_name.items() if pattern.match(n)}
            if len(hits) == 1:
                self.repaired.setdefault(register, {})[name] = next(iter(hits))
                return next(iter(hits))
        self.unmatched.setdefault(register, set()).add(name)
        return None
