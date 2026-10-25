"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, IconButton, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { brand } from "@/brand";
import { excerpt, kindLabels, marks, prepare, queryWords, search, sitePages, type PreparedEntry, type SearchEntry, type SearchKind } from "@/lib/search";

const SIZE = 44;
const WIDEST = 720;
// Decelerates into place: quick to answer the click, unhurried at the end.
const EASE = "cubic-bezier(.22,1,.36,1)";
const still = "@media (prefers-reduced-motion: reduce)";
const rise = keyframes({ from: { opacity: 0, transform: "translateY(-6px)" }, to: { opacity: 1, transform: "none" } });

const pages = prepare(sitePages);
// Loaded the first time the search is opened and kept while the visitor moves between pages.
let loaded: Promise<PreparedEntry[]> | null = null;
function loadIndex() {
  loaded ??= fetch("/api/search")
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((entries: SearchEntry[]) => [...pages, ...prepare(entries)])
    .catch((error) => { loaded = null; throw error; });
  return loaded;
}

type Row = { id: string; href: string; entry: SearchEntry } | { id: string; more: SearchKind; total: number };

function Marked({ text, words }: { text: string; words: string[] }) {
  return <>{marks(text, words).map((part, i) => (part.hit ? <Box component="mark" key={i} sx={{ bgcolor: "rgba(0,163,224,.2)", color: "inherit" }}>{part.text}</Box> : part.text))}</>;
}

// The search of the site, in the header. Closed, it is one icon; opened, a field unfolds from it
// over the bar, up to the logo (`clear`) or, where the bar is narrow, across all of it (`bounds`).
export function SiteSearch({ open, onOpenChange, bounds, clear }: { open: boolean; onOpenChange: (open: boolean) => void; bounds: RefObject<HTMLElement | null>; clear: RefObject<HTMLElement | null> }) {
  const router = useRouter();
  const id = useId();
  const slot = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // The width of the open field, and how far the results reach beyond its right edge on a narrow bar.
  const [size, setSize] = useState({ width: SIZE, beyond: 0 });
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<PreparedEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [whole, setWhole] = useState<SearchKind | null>(null);
  const [active, setActive] = useState(0);

  const measure = useCallback(() => {
    const here = slot.current?.getBoundingClientRect(), bar = bounds.current?.getBoundingClientRect(), logo = clear.current?.getBoundingClientRect();
    if (!here || !bar) return;
    const wide = window.matchMedia("(min-width:900px)").matches;
    setSize(wide && logo ? { width: Math.min(WIDEST, here.right - logo.right - 40), beyond: 0 } : { width: here.right - bar.left, beyond: bar.right - here.right });
  }, [bounds, clear]);

  const show = useCallback(() => {
    measure();
    onOpenChange(true);
    setFailed(false);
    loadIndex().then(setIndex, () => setFailed(true));
  }, [measure, onOpenChange]);

  const hide = useCallback((returnFocus = true) => {
    onOpenChange(false);
    setQuery("");
    setWhole(null);
    if (returnFocus && slot.current?.contains(document.activeElement)) trigger.current?.focus();
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!slot.current?.contains(event.target as Node)) hide(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", measure);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", measure); };
  }, [open, hide, measure]);

  // Ctrl+K, or ⌘K on a Mac, opens the search from anywhere on the page.
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (open) input.current?.focus(); else show();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [open, show]);

  const words = useMemo(() => queryWords(query), [query]);
  const asked = query.trim().length >= 2;
  const groups = useMemo(() => (asked ? search(index ?? pages, query, 5, whole ?? undefined) : []), [asked, index, query, whole]);
  const rows = useMemo(() => groups.flatMap((group): Row[] => [
    ...group.entries.map((entry, i) => ({ id: `${id}-${group.kind}-${i}`, href: entry.href, entry })),
    ...(group.total > group.entries.length && group.kind !== whole ? [{ id: `${id}-${group.kind}-more`, more: group.kind, total: group.total }] : []),
  ]), [groups, id, whole]);
  const current = rows[Math.min(active, rows.length - 1)];

  useEffect(() => { document.getElementById(current?.id ?? "")?.scrollIntoView({ block: "nearest" }); }, [current?.id]);

  function choose(row: Row) {
    if ("more" in row) {
      // The rows before it stay where they are, so the selection stays on the first of the new ones.
      setWhole(row.more);
      input.current?.focus();
      return;
    }
    hide(false);
    router.push(row.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); hide(); }
    else if (event.key === "ArrowDown" && rows.length) { event.preventDefault(); setActive((at) => (Math.min(at, rows.length - 1) + 1) % rows.length); }
    else if (event.key === "ArrowUp" && rows.length) { event.preventDefault(); setActive((at) => (Math.min(at, rows.length - 1) - 1 + rows.length) % rows.length); }
    else if (event.key === "Enter" && current) { event.preventDefault(); choose(current); }
  }

  const loading = asked && !index && !failed;
  const status = !asked ? "" : rows.length ? `${rows.length} resultados` : loading ? "Buscando" : "Sin resultados";
  const rowSx = (row: Row) => ({
    display: "block", px: 2, py: 1.1, color: "text.primary", textDecoration: "none", cursor: "pointer", scrollMarginBlock: 8,
    ...(row.id === current?.id && { bgcolor: brand.accentSoft, boxShadow: `inset 3px 0 0 ${brand.accent}` }),
  });

  return (
    <Box ref={slot} sx={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
      <Box
        role="search"
        onKeyDown={open ? onKeyDown : undefined}
        style={{ width: open ? size.width : SIZE }}
        sx={{ position: "absolute", top: 0, right: 0, height: SIZE, zIndex: 2, bgcolor: brand.navy, transition: `width .44s ${EASE}`, [still]: { transition: "none" } }}
      >
        <Box sx={{
          display: "flex", alignItems: "center", height: "100%", overflow: "hidden",
          bgcolor: open ? "rgba(255,255,255,.08)" : "transparent",
          boxShadow: open ? "inset 0 0 0 1px rgba(255,255,255,.24)" : "inset 0 0 0 1px transparent",
          transition: "background-color .3s ease, box-shadow .3s ease",
          "&:focus-within": open ? { boxShadow: `inset 0 0 0 1px ${brand.accent}` } : undefined,
          [still]: { transition: "none" },
        }}>
          <IconButton
            ref={trigger}
            aria-label="Buscar en el sitio"
            aria-expanded={open}
            title={open ? undefined : "Buscar"}
            onClick={() => (open ? input.current?.focus() : show())}
            tabIndex={open ? -1 : 0}
            sx={{ width: SIZE, height: SIZE, flexShrink: 0, color: "#ffffff", borderRadius: 0, "&:hover": { bgcolor: open ? "transparent" : "rgba(0,163,224,.12)" }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 } }}
          >
            <SearchRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Box
            component="input"
            ref={input}
            type="text"
            role="combobox"
            aria-label="Buscar en el sitio"
            aria-autocomplete="list"
            aria-expanded={open && asked}
            aria-controls={`${id}-results`}
            aria-activedescendant={open && current ? current.id : undefined}
            placeholder="Buscar recomendaciones, ODS, páginas…"
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => { setQuery(event.target.value.slice(0, 120)); setWhole(null); setActive(0); }}
            tabIndex={open ? 0 : -1}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            sx={{
              flex: 1, minWidth: 0, height: "100%", p: 0, border: 0, outline: 0, bgcolor: "transparent", color: "#ffffff", font: "inherit",
              // 16px: a phone does not zoom into the page when the field takes the focus.
              fontSize: { xs: "1rem", md: ".95rem" },
              visibility: open ? "visible" : "hidden", opacity: open ? 1 : 0, transform: open ? "none" : "translateX(14px)",
              transition: open ? `opacity .3s ease .1s, transform .44s ${EASE}, visibility 0s` : "opacity .12s ease, transform .2s ease, visibility 0s .2s",
              "&::placeholder": { color: "rgba(255,255,255,.62)", opacity: 1 },
              [still]: { transition: "none" },
            }}
          />
          <IconButton
            aria-label="Cerrar la búsqueda"
            onClick={() => hide()}
            tabIndex={open ? 0 : -1}
            sx={{
              width: SIZE, height: SIZE, flexShrink: 0, color: "rgba(255,255,255,.82)", borderRadius: 0,
              visibility: open ? "visible" : "hidden", opacity: open ? 1 : 0, transform: open ? "none" : "rotate(-90deg)",
              transition: open ? `opacity .3s ease .14s, transform .44s ${EASE} .06s, visibility 0s` : "opacity .12s ease, visibility 0s .2s",
              "&:hover": { color: "#ffffff", bgcolor: "rgba(255,255,255,.08)" }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 },
              [still]: { transition: "none" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box role="status" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{open ? status : ""}</Box>

        {/* The results hang from the bottom rule of the header. */}
        {open && asked && (
          <Box
            style={{ right: -size.beyond }}
            sx={{
              position: "absolute", left: 0, top: "100%", mt: { xs: "8px", md: "12px" }, bgcolor: "#fff", color: "text.primary",
              border: "1px solid", borderColor: "divider", borderTop: 0, boxShadow: "0 18px 40px rgba(10,30,51,.2)",
              animation: `${rise} .24s ${EASE}`, [still]: { animation: "none" },
            }}
          >
            <Box id={`${id}-results`} role="listbox" aria-label="Resultados" sx={{ maxHeight: "min(64vh, 520px)", overflowY: "auto", overscrollBehavior: "contain", py: rows.length ? .75 : 0 }}>
              {groups.map((group) => (
                <Box key={group.kind} role="group" aria-labelledby={`${id}-${group.kind}`}>
                  <Typography id={`${id}-${group.kind}`} variant="overline" color="text.secondary" sx={{ display: "block", px: 2, pt: 1.25, pb: .25, lineHeight: 1.6 }}>{kindLabels[group.kind]}</Typography>
                  {rows.filter((row) => row.id.startsWith(`${id}-${group.kind}-`)).map((row) => "more" in row ? (
                    <Box key={row.id} id={row.id} role="option" aria-selected={row.id === current?.id} onClick={() => choose(row)} onPointerMove={() => setActive(rows.indexOf(row))} sx={rowSx(row)}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "secondary.dark" }}>Ver los {row.total} resultados</Typography>
                    </Box>
                  ) : (
                    <Box key={row.id} id={row.id} role="option" aria-selected={row.id === current?.id} component={Link} href={row.href} tabIndex={-1} onClick={() => hide(false)} onPointerMove={() => setActive(rows.indexOf(row))} sx={rowSx(row)}>
                      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", columnGap: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "primary.main", lineHeight: 1.4 }}><Marked text={row.entry.title} words={words} /></Typography>
                        {row.entry.note && <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, maxWidth: "45%", textAlign: "right", fontVariantNumeric: "tabular-nums", display: { xs: "none", sm: "block" } }}><Marked text={row.entry.note} words={words} /></Typography>}
                      </Box>
                      {row.entry.note && <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", sm: "none" } }}><Marked text={row.entry.note} words={words} /></Typography>}
                      {row.entry.text && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: .25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
                          <Marked text={excerpt(row.entry.text, words)} words={words} />
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
              {!rows.length && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                  {loading ? "Buscando…" : `No hay resultados para «${query.trim()}».`}
                </Typography>
              )}
            </Box>
            {failed && <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1, borderTop: "1px solid", borderColor: "divider" }}>Ahora solo se puede buscar entre las páginas del sitio: no se han podido cargar las recomendaciones.</Typography>}
            <Typography aria-hidden variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: rows.length ? "block" : "none" }, px: 2, py: .9, bgcolor: brand.soft, borderTop: "1px solid", borderColor: "divider" }}>
              ↑ ↓ para moverse · Intro para abrir · Esc para cerrar
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
