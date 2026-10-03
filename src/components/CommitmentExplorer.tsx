"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, Divider, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import type { Commitment } from "@/lib/hrct";
import { StatusChip } from "./StatusChip";

type Props = {
  commitments: Commitment[];
  // public_id → human-security dimension codes
  dimensionsById?: Record<string, string[]>;
  // public_id → number of public live-monitoring items
  monitoringCounts?: Record<string, number>;
};

const dimensionNames: Record<string, string> = {
  economic: "Economic security",
  food: "Food security",
  health: "Health security",
  environmental: "Environmental security",
  personal: "Personal security",
  community: "Community security",
  political: "Political security",
};

export function CommitmentExplorer({ commitments, dimensionsById = {}, monitoringCounts = {} }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [acceptance, setAcceptance] = useState("all");
  const [dimension, setDimension] = useState("all");

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
            placeholder="Search recommendation number or keyword"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl sx={{ minWidth: { xs: "100%", md: 210 } }}>
            <InputLabel id="status-filter">Implementation</InputLabel>
            <Select labelId="status-filter" label="Implementation" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="not_assessed">Assessment pending</MenuItem>
              <MenuItem value="implemented">Implemented</MenuItem>
              <MenuItem value="substantially_implemented">Substantial progress</MenuItem>
              <MenuItem value="limited_progress">Limited progress</MenuItem>
              <MenuItem value="not_implemented">No implementation</MenuItem>
              <MenuItem value="regressed">Regressed</MenuItem>
              <MenuItem value="unable_to_assess">Insufficient evidence</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 175 } }}>
            <InputLabel id="acceptance-filter">State response</InputLabel>
            <Select labelId="acceptance-filter" label="State response" value={acceptance} onChange={(e) => setAcceptance(e.target.value)}>
              <MenuItem value="all">All responses</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="partially_accepted">Partially accepted</MenuItem>
              <MenuItem value="noted">Noted</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: "100%", md: 210 } }}>
            <InputLabel id="dimension-filter">Human security</InputLabel>
            <Select labelId="dimension-filter" label="Human security" value={dimension} onChange={(e) => setDimension(e.target.value)}>
              <MenuItem value="all">All dimensions</MenuItem>
              {Object.entries(dimensionNames).map(([code, name]) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={.5}>
        <Typography variant="body2" color="text.secondary">{visible.length} recommendation{visible.length === 1 ? "" : "s"}</Typography>
        <Typography variant="caption" color="text.secondary">UN Human Rights Council · A/HRC/60/8</Typography>
      </Stack>

      <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        {visible.map((c, index) => (
          <Box key={c.id}>
            {index > 0 && <Divider />}
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.5, md: 3 }} sx={{ py: { xs: 2.25, md: 2.75 } }}>
              <Box sx={{ width: { md: 92 }, flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary">Recommendation</Typography>
                <Typography color="primary.main" sx={{ mt: .25, fontWeight: 500 }}>{c.recommendation_number || c.public_id}</Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: .9 }}>
                  <StatusChip status={c.assessment_status} />
                  <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>
                    {c.acceptance_status === "accepted" ? "Accepted by Spain" : c.acceptance_status === "noted" ? "Noted by Spain" : (c.acceptance_status || "State response pending")}
                  </Typography>
                  {c.assessment_provisional && c.assessment_status !== "not_assessed" && (
                    <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>Pending final confirmation</Typography>
                  )}
                  {monitoringCounts[c.public_id] > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ py: .35 }}>
                      {monitoringCounts[c.public_id]} live monitoring item{monitoringCounts[c.public_id] === 1 ? "" : "s"}
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
                  View record
                </Button>
              </Box>
            </Stack>
          </Box>
        ))}

        {!visible.length && (
          <Box sx={{ textAlign: "center", py: 7, px: 2 }}>
            <Typography variant="h6" color="primary.main">No recommendations match these filters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Try a broader search or clear one of the filters.</Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
