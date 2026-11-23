// The map of the Atlas: four areas, each with its own pages. The bar of the Atlas, its footer and
// its home page read it, so a page is added in one place. No dependencies: server and client share it.

export type AtlasPage = { label: string; href: string; hint: string };
export type AtlasArea = { id: "derechos" | "instrumentos" | "paises" | "proteccion"; label: string; href: string; question: string; pages: AtlasPage[]; match: string[] };

export const atlasAreas: AtlasArea[] = [
  {
    id: "derechos",
    label: "Derechos",
    href: "/atlas/topics",
    question: "¿Qué protege cada derecho y dónde está escrito?",
    match: ["/atlas/topics"],
    pages: [{ label: "Todos los derechos", href: "/atlas/topics", hint: "Artículos, interpretaciones y mecanismos de cada derecho" }],
  },
  {
    id: "instrumentos",
    label: "Instrumentos",
    href: "/atlas/instruments",
    question: "¿Qué dicen los tratados, artículo por artículo?",
    match: ["/atlas/instruments", "/atlas/timeline"],
    pages: [
      { label: "Biblioteca", href: "/atlas/instruments", hint: "Tratados, protocolos y declaraciones con su texto oficial" },
      { label: "Cronología", href: "/atlas/timeline", hint: "Adopción y entrada en vigor, año por año" },
    ],
  },
  {
    id: "paises",
    label: "Países",
    href: "/atlas/countries",
    question: "¿A qué se ha comprometido cada Estado?",
    match: ["/atlas/countries", "/atlas/ratifications", "/atlas/compare"],
    pages: [
      { label: "Estados", href: "/atlas/countries", hint: "Ratificaciones, reservas y procedimientos aceptados" },
      { label: "Mapa de ratificaciones", href: "/atlas/ratifications", hint: "Un tratado, todos los Estados" },
      { label: "Comparar", href: "/atlas/compare", hint: "Hasta cinco Estados, lado a lado" },
    ],
  },
  {
    id: "proteccion",
    label: "Protección",
    href: "/atlas/mechanisms",
    question: "¿Ante quién se puede reclamar y cómo?",
    match: ["/atlas/mechanisms", "/atlas/bodies", "/atlas/case-law"],
    pages: [
      { label: "Procedimientos", href: "/atlas/mechanisms", hint: "Quién puede acudir, requisitos y plazos citados de su norma" },
      { label: "Orientador", href: "/atlas/mechanisms/guide", hint: "Qué vías constan para un Estado y un derecho" },
      { label: "Órganos", href: "/atlas/bodies", hint: "Tribunales, comités y comisiones" },
      { label: "Jurisprudencia", href: "/atlas/case-law", hint: "Observaciones generales y decisiones" },
    ],
  },
];

export const atlasAbout: AtlasPage[] = [
  { label: "Fuentes y cobertura", href: "/atlas/sources", hint: "Qué se ha recopilado, de dónde y con qué límites" },
  { label: "Anotaciones de Blue Human", href: "/atlas/annotations", hint: "Notas firmadas, separadas del texto oficial" },
  { label: "Buscar en el Atlas", href: "/atlas/search", hint: "Todo el contenido, con filtros" },
];

export function areaOf(pathname: string) {
  return atlasAreas.find((a) => a.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))) ?? null;
}

// The page of an area that the path belongs to: the longest matching address wins, so the guide
// (/atlas/mechanisms/guide) is not taken for the list of procedures (/atlas/mechanisms).
export function pageOf(area: AtlasArea, pathname: string) {
  return [...area.pages]
    .sort((a, b) => b.href.length - a.href.length)
    .find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)) ?? null;
}
