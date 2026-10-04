"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, Divider, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { acceptanceLabels, statusLabels, type Commitment } from "@/lib/hrct";
import { StatusChip } from "./StatusChip";

type Props = {
  commitments: Commitment[];
  // public_id → human-security dimension codes
  dimensionsById?: Record<string, string[]>;
  // public_id → number of public live-monitoring items
  monitoringCounts?: Record<string, number>;
};

const dimensionNames: Record<string, string> = {
  economic: "Seguridad económica",
  food: "Seguridad alimentaria",
  health: "Seguridad sanitaria",
  environmental: "Seguridad ambiental",
  personal: "Seguridad personal",
  community: "Seguridad comunitaria",
  political: "Seguridad política",
};

// The full catalogue is long: the list grows on request instead of rendering every record at once.
const PAGE_SIZE = 40;

export function CommitmentExplorer({ commitments, dimensionsById = {}, monitoringCounts = {} }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [acceptance, setAcceptance] = useState("all");
  const [dimension, setDimension] = useState("all");
  const filterKey = `${query}|${status}|${acceptance}|${dimension}`;
  const [expanded, setExpanded] = useState({ key: filterKey, count: PAGE_SIZE });
  const shown = expanded.key === filterKey ? expanded.count : PAGE_SIZE;

  const visible = useMemo(() => commitments.filter((c) => {
    const text = `${c.public_id} ${c.recommendation_number ?? ""} ${c.title} ${c.original_text} ${c.country_name}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || c.assessment_status === status) && (acceptance === "all" || c.acceptance_status === acceptance) && (dimension === "all" || (dimensionsById[c.public_id] || []).includes(dimension));
  }), [commitments, query, status, acceptance, dimension, dimensionsById]);

  return (
    <Stack spacing={2.25}>
      <Paper variant="outlined" square sx={{ p: { xs: 2, md: 2.25 }, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número de recomendación o palabra clave"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl sx={{ minWidth: { xs: "100%", md: 210 } }}>
            <InputLabel id="status-filter">Cumplimiento</InputLabel>
            <Select labelId="status-filter" label="Cumplimiento" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="all">Todos los estados</MenuItem>
              {["not_assessed", "implemented", "substantially_implemented", "limited_progress", "not_implemented", "regressed", "unable_to_assess"].map((code) => <MenuItem key={code} value={code}>{statusLabels[code]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 175 } }}>
            <InputLabel id="acceptance-filter">Respuesta del Estado</InputLabel>
            <Select labelId="acceptance-filter" label="Respuesta del Estado" value={acceptance} onChange={(e) => setAcceptance(e.target.value)}>
              <MenuItem value="all">Todas las respuestas</MenuItem>
              {Object.entries(acceptanceLabels).map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 210 } }}>
            <InputLabel id="dimension-filter">Seguridad humana</InputLabel>
            <Select labelId="dimension-filter" label="Seguridad humana" value={dimension} onChange={(e) => setDimension(e.target.value)}>
              <MenuItem value="all">Todas las dimensiones</MenuItem>
              {Object.entries(dimensionNames).map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={.5}>
        <Typography variant="body2" color="text.secondary">{visible.length} {visible.length === 1 ? "recomendación" : "recomendaciones"}</Typography>
        <Typography variant="caption" color="text.secondary">Consejo de Derechos Humanos de la ONU · A/HRC/60/8</Typography>
      </Stack>

      <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        {visible.slice(0, shown).map((c, index) => (
          <Box key={c.id}>
            {index > 0 && <Divider />}
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.5, md: 3 }} sx={{ py: { xs: 2.25, md: 2.75 } }}>
              <Box sx={{ width: { md: 92 }, flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary">Recomendación</Typography>
                <Typography color="primary.main" sx={{ mt: .25, fontWeight: 500 }}>{c.recommendation_number || c.public_id}</Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: .9 }}>
                  <StatusChip status={c.assessment_status} />
                  <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>
                    {c.acceptance_status ? `${acceptanceLabels[c.acceptance_status] || c.acceptance_status} por España` : "Respuesta del Estado pendiente"}
                  </Typography>
                  {c.assessment_provisional && c.assessment_status !== "not_assessed" && (
                    <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>Pendiente de confirmación final</Typography>
                  )}
                  {monitoringCounts[c.public_id] > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>
                      {monitoringCounts[c.public_id]} {monitoringCounts[c.public_id] === 1 ? "novedad" : "novedades"} en seguimiento
                    </Typography>
                  )}
                </Stack>
                <Typography variant="h6" color="primary.main" sx={{ mb: .75 }}>{c.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 860 }}>
                  {c.normalized_summary || c.original_text}
                </Typography>
              </Box>

              <Box sx={{ width: { md: 115 }, flexShrink: 0, display: "flex", alignItems: { md: "center" }, justifyContent: { md: "flex-end" } }}>
                <Button component={Link} href={`/commitments/${encodeURIComponent(c.public_id)}`} color="primary">
                  Ver ficha
                </Button>
              </Box>
            </Stack>
          </Box>
        ))}

        {!visible.length && (
          <Box sx={{ textAlign: "center", py: 7, px: 2 }}>
            <Typography variant="h6" color="primary.main">Ninguna recomendación coincide con estos filtros</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Prueba con una búsqueda más amplia o quita alguno de los filtros.</Typography>
          </Box>
        )}
      </Box>

      {visible.length > shown && (
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5}>
          <Button variant="outlined" color="primary" onClick={() => setExpanded({ key: filterKey, count: shown + PAGE_SIZE })}>
            Mostrar más recomendaciones
          </Button>
          <Typography variant="caption" color="text.secondary">Se muestran {shown} de {visible.length}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
