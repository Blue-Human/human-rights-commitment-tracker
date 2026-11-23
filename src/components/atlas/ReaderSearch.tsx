"use client";

import { useEffect, useMemo, useState } from "react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, InputAdornment, TextField, Typography } from "@mui/material";
import { fold, queryWords } from "@/lib/search";

// Search inside the instrument shown on the page: hides the articles that do not contain every word
// of the query and says how many remain. The text itself stays as the server rendered it.
export function ReaderSearch({ container }: { container: string }) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const words = useMemo(() => queryWords(query), [query]);

  useEffect(() => {
    const root = document.getElementById(container);
    if (!root) return;
    const articles = Array.from(root.querySelectorAll<HTMLElement>("[data-article]"));
    const headings = Array.from(root.querySelectorAll<HTMLElement>("[data-heading]"));
    if (!words.length) {
      articles.forEach((el) => { el.hidden = false; });
      headings.forEach((el) => { el.hidden = false; });
      setCount(null);
      return;
    }
    let shown = 0;
    for (const el of articles) {
      const text = el.dataset.folded ?? (el.dataset.folded = fold(el.textContent || ""));
      const hit = words.every((w) => text.includes(w));
      el.hidden = !hit;
      if (hit) shown++;
    }
    headings.forEach((el) => { el.hidden = true; });
    setCount(shown);
  }, [words, container]);

  return (
    <Box>
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar en este texto"
        fullWidth
        inputProps={{ "aria-label": "Buscar en el texto de este instrumento" }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
      />
      <Typography role="status" variant="caption" color="text.secondary" sx={{ display: "block", mt: .75, minHeight: 18 }}>
        {count === null ? "" : count === 1 ? "1 artículo contiene la búsqueda." : `${count} artículos contienen la búsqueda.`}
      </Typography>
    </Box>
  );
}
