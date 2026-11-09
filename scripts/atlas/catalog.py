"""What the Atlas covers, and where each record is looked up.

The catalogue holds identifiers and pointers only: the system an instrument belongs to, its stable
id, and the query that finds it in each official source. Titles, dates, parties, articles and every
other legal fact are read from the sources by the adapters, never written here.

Selection (an objective inventory, see docs/atlas/sources.md):
- United Nations: the 18 instruments of the OHCHR ratification dashboard
  (indicators.ohchr.org, read by `discover_un`), their amendments registered by the depositary,
  the Universal Declaration, and three related instruments of the same register (genocide,
  refugees) kept apart as "related".
- Council of Europe, Organization of American States and African Union: the human-rights
  conventions whose supervisory bodies are in the directory (Court, Commission, Committee).
"""

# The OHCHR dashboard names each instrument; the depositary register (UNTC, chapter IV) is matched
# by exact title. `ohchr` is the acronym of the OHCHR treaty body database (tbinternet), where the
# per-State entry into force and the acceptance of procedures are published.
UN_CORE = [
    # id, OHCHR treaty-body acronym, supervisory body, parent
    ("un-icerd", "CERD", "un-cerd", None),
    ("un-icescr", "CESCR", "un-cescr", None),
    ("un-icescr-op", "CESCR-OP", "un-cescr", "un-icescr"),
    ("un-iccpr", "CCPR", "un-ccpr", None),
    ("un-iccpr-op1", "CCPR-OP1", "un-ccpr", "un-iccpr"),
    ("un-iccpr-op2", "CCPR-OP2-DP", "un-ccpr", "un-iccpr"),
    ("un-cedaw", "CEDAW", "un-cedaw", None),
    ("un-cedaw-op", "CEDAW-OP", "un-cedaw", "un-cedaw"),
    ("un-cat", "CAT", "un-cat", None),
    ("un-opcat", "CAT-OP", "un-spt", "un-cat"),
    ("un-crc", "CRC", "un-crc", None),
    ("un-crc-opac", "CRC-OP-AC", "un-crc", "un-crc"),
    ("un-crc-opsc", "CRC-OP-SC", "un-crc", "un-crc"),
    ("un-crc-opic", "CRC-OP-IC", "un-crc", "un-crc"),
    ("un-cmw", "CMW", "un-cmw", None),
    ("un-crpd", "CRPD", "un-crpd", None),
    ("un-crpd-op", "CRPD-OP", "un-crpd", "un-crpd"),
    ("un-ced", "CED", "un-ced", None),
]

# Matched against the OHCHR dashboard title (RatificationName) of each core instrument, in the
# order of UN_CORE. The dashboard lists exactly these 18; `discover_un` fails if it changes.
UN_DASHBOARD_ACRONYMS = {
    "un-icerd": "ICERD", "un-icescr": "ICESCR", "un-icescr-op": "CESCR-OP", "un-iccpr": "ICCPR",
    "un-iccpr-op1": "ICCPR-OP1", "un-iccpr-op2": "ICCPR-OP2", "un-cedaw": "CEDAW", "un-cedaw-op": "OP-CEDAW",
    "un-cat": "CAT", "un-opcat": "OP-CAT", "un-crc": "CRC", "un-crc-opac": "OP-CRC-AC", "un-crc-opsc": "OP-CRC-SC",
    "un-crc-opic": "CRC-OP-IC", "un-cmw": "ICRMW", "un-crpd": "CRPD", "un-crpd-op": "CRPD-OP", "un-ced": "CPED",
}

# Instruments of the same register that are not among the 18: amendments (attached to the treaty
# they amend) and related instruments. Located in UNTC by the start of their English title.
UN_REGISTER_EXTRA = [
    ("un-icerd-amend-8", "Amendment to article 8 of the International Convention on the Elimination of All Forms of Racial Discrimination", "amendment", "un-icerd"),
    ("un-cedaw-amend-20", "Amendment to article 20, paragraph 1 of the Convention on the Elimination of All Forms of Discrimination against Women", "amendment", "un-cedaw"),
    ("un-cat-amend-17-18", "Amendments to articles 17 (7) and 18 (5) of the Convention against Torture", "amendment", "un-cat"),
    ("un-crc-amend-43", "Amendment to article 43 (2) of the Convention on the Rights of the Child", "amendment", "un-crc"),
    ("un-genocide", "Convention on the Prevention and Punishment of the Crime of Genocide", "related", None),
]
UN_REFUGEES = [
    # Chapter V of the register (refugees and stateless persons).
    ("un-refugees-1951", "Convention relating to the Status of Refugees", "related", None),
    ("un-refugees-1967", "Protocol relating to the Status of Refugees", "related", "un-refugees-1951"),
]

# Spanish text published in the Boletín Oficial del Estado. The query is the exact phrase that the
# BOE title contains; the adapter keeps the single "Acuerdo Internacional" whose title has it (and
# fails when there is none or more than one). Pinned identifiers, once checked, avoid ambiguity.
BOE = {
    "un-icerd": {"phrase": "Convención Internacional sobre la Eliminación de todas las Formas de Discriminación Racial"},
    "un-icescr": {"phrase": "Pacto Internacional de Derechos Económicos, Sociales y Culturales"},
    "un-icescr-op": {"phrase": "Protocolo Facultativo del Pacto Internacional de Derechos Económicos, Sociales y Culturales"},
    "un-iccpr": {"phrase": "Pacto Internacional de Derechos Civiles y Políticos"},
    "un-iccpr-op1": {"phrase": "Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos"},
    "un-iccpr-op2": {"phrase": "Segundo Protocolo Facultativo del Pacto Internacional de Derechos Civiles y Políticos"},
    "un-cedaw": {"phrase": "Convención sobre la eliminación de todas las formas de discriminación contra la mujer"},
    "un-cedaw-op": {"phrase": "Protocolo Facultativo de la Convención sobre la eliminación de todas las formas de discriminación contra la mujer"},
    "un-cat": {"phrase": "Convención contra la Tortura y Otros Tratos o Penas Crueles, Inhumanos o Degradantes"},
    "un-opcat": {"phrase": "Protocolo Facultativo de la Convención contra la Tortura"},
    "un-crc": {"phrase": "Convención sobre los Derechos del Niño"},
    "un-crc-opac": {"phrase": "participación de niños en los conflictos armados"},
    "un-crc-opsc": {"phrase": "venta de niños, la prostitución infantil y la utilización de niños en la pornografía"},
    "un-crc-opic": {"phrase": "procedimiento de comunicaciones"},
    "un-crpd": {"phrase": "Convención sobre los derechos de las personas con discapacidad"},
    "un-crpd-op": {"phrase": "Protocolo Facultativo a la Convención sobre los derechos de las personas con discapacidad"},
    "un-ced": {"phrase": "Convención Internacional para la protección de todas las personas contra las desapariciones forzadas"},
    "un-genocide": {"phrase": "Convenio para la prevención y la sanción del delito de genocidio"},
    "un-refugees-1951": {"phrase": "Convención sobre el Estatuto de los Refugiados"},
    "un-refugees-1967": {"phrase": "Protocolo sobre el Estatuto de los Refugiados"},
    # Council of Europe
    "coe-echr": {"phrase": "Convenio para la Protección de los Derechos Humanos y de las Libertades Fundamentales"},
    "coe-esc-1961": {"phrase": "Carta Social Europea"},
    "coe-esc-revised": {"phrase": "Carta Social Europea (revisada)"},
    "coe-esc-collective": {"phrase": "Protocolo Adicional a la Carta Social Europea en el que se establece un sistema de reclamaciones colectivas"},
    "coe-cpt": {"phrase": "Convenio Europeo para la Prevención de la Tortura"},
    "coe-fcnm": {"phrase": "Convenio-marco para la protección de las minorías nacionales"},
    "coe-trafficking": {"phrase": "Convenio del Consejo de Europa sobre la lucha contra la trata de seres humanos"},
    "coe-lanzarote": {"phrase": "Convenio del Consejo de Europa para la protección de los niños contra la explotación y el abuso sexual"},
    "coe-istanbul": {"phrase": "Convenio del Consejo de Europa sobre prevención y lucha contra la violencia contra las mujeres y la violencia doméstica"},
}

# Council of Europe. The Treaty Office (coe.int/conventions) refuses automated access, so these
# records take their text from the BOE (Spain is a party to all of them) or from the Court.
COE = [
    # id, kind, parent, supervisory bodies
    ("coe-echr", "treaty", None, ["coe-ecthr", "coe-cm"]),
    ("coe-esc-1961", "treaty", None, ["coe-ecsr"]),
    ("coe-esc-revised", "treaty", None, ["coe-ecsr"]),
    ("coe-esc-collective", "protocol", "coe-esc-1961", ["coe-ecsr"]),
    ("coe-cpt", "treaty", None, ["coe-cpt-committee"]),
    ("coe-fcnm", "treaty", None, ["coe-cm"]),
    ("coe-trafficking", "treaty", None, ["coe-greta"]),
    ("coe-lanzarote", "treaty", None, ["coe-lanzarote-committee"]),
    ("coe-istanbul", "treaty", None, ["coe-grevio"]),
]

# Organization of American States: the treaty code of the OAS Department of International Law,
# under which the Spanish text and the table of signatures and ratifications are published.
OAS = [
    # id, OAS code, kind, parent, supervisory bodies
    ("oas-achr", "B-32", "treaty", None, ["oas-iachr", "oas-iacthr"]),
    ("oas-san-salvador", "A-52", "protocol", "oas-achr", ["oas-iachr", "oas-iacthr"]),
    ("oas-death-penalty", "A-53", "protocol", "oas-achr", ["oas-iachr", "oas-iacthr"]),
    ("oas-torture", "A-51", "treaty", None, ["oas-iachr", "oas-iacthr"]),
    ("oas-disappearance", "A-60", "treaty", None, ["oas-iachr", "oas-iacthr"]),
    ("oas-belem-do-para", "A-61", "treaty", None, ["oas-iachr", "oas-iacthr"]),
    ("oas-disability", "A-65", "treaty", None, []),
    ("oas-racism", "A-68", "treaty", None, []),
    ("oas-discrimination", "A-69", "treaty", None, []),
    ("oas-older-persons", "A-70", "treaty", None, []),
    # Constitutive instrument: its register lists the member States of the Organization.
    ("oas-charter", "A-41", "charter", None, ["oas-iachr"]),
]

# African Union: the treaty page on au.int (text and status list) and, for the Charter, the
# English text published by the African Commission.
AU = [
    # id, au.int treaty slug, kind, parent, supervisory bodies
    ("au-achpr", "african-charter-human-and-peoples-rights", "treaty", None, ["au-achpr-commission", "au-afchpr"]),
    ("au-court-protocol", "protocol-african-charter-human-and-peoples-rights-establishment-african-court-human-and", "protocol", "au-achpr", ["au-afchpr"]),
    ("au-maputo", "protocol-african-charter-human-and-peoples-rights-rights-women-africa", "protocol", "au-achpr", ["au-achpr-commission", "au-afchpr"]),
    ("au-acrwc", "african-charter-rights-and-welfare-child", "treaty", None, ["au-acerwc"]),
]
