"use client";

import { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { fold } from "@/lib/search";

// Filters the list of countries rendered by the server, by name, accents ignored.
export function CountryFilter() {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const q = fold(query.trim());
    document.querySelectorAll<HTMLElement>("[data-country]").forEach((el) => { el.hidden = !!q && !fold(el.dataset.country || "").includes(q); });
    document.querySelectorAll<HTMLElement>("[data-region]").forEach((section) => {
      section.hidden = !!q && !section.querySelector("[data-country]:not([hidden])");
    });
  }, [query]);
  return <TextField label="Buscar un país" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ maxWidth: 420 }} fullWidth />;
}
