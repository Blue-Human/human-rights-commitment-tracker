import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button, InputBase } from "@mui/material";
import { brand } from "@/brand";

// The search of the Atlas as a plain form: it works before any script has loaded and leads to the
// results page, where the filters are.
export function AtlasSearchBox({ defaultValue = "", light = false }: { defaultValue?: string; light?: boolean }) {
  return (
    <Box component="form" action="/atlas/search" method="get" role="search" sx={{ display: "flex", alignItems: "stretch", bgcolor: "#fff", border: light ? `1px solid ${brand.border}` : "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", pl: 1.75, color: brand.muted }}><SearchRoundedIcon /></Box>
      <InputBase
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar un derecho, un tratado, un artículo, un país o un órgano"
        inputProps={{ "aria-label": "Buscar en el Atlas" }}
        sx={{ flex: 1, px: 1.5, py: 1.25, fontSize: "1rem", color: brand.ink }}
      />
      <Button type="submit" variant="contained" color="secondary" disableElevation sx={{ px: { xs: 2, sm: 3 }, borderRadius: 0, color: brand.navy, fontWeight: 600 }}>Buscar</Button>
    </Box>
  );
}
