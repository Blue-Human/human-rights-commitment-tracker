"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Divider, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import type { Commitment } from "@/lib/hrct";
import { StatusChip } from "./StatusChip";

export function CommitmentExplorer({ commitments }: { commitments: Commitment[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [acceptance, setAcceptance] = useState("all");

  const visible = useMemo(() => commitments.filter((c) => {
    const text = `${c.public_id} ${c.recommendation_number ?? ""} ${c.title} ${c.original_text} ${c.country_name}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || c.assessment_status === status) && (acceptance === "all" || c.acceptance_status === acceptance);
  }), [commitments, query, status, acceptance]);

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" square sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by recommendation number, title or keyword"
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
          <FormControl sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="acceptance-filter">State response</InputLabel>
            <Select labelId="acceptance-filter" label="State response" value={acceptance} onChange={(e) => setAcceptance(e.target.value)}>
              <MenuItem value="all">All responses</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="partially_accepted">Partially accepted</MenuItem>
              <MenuItem value="noted">Noted</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">{visible.length} recommendation{visible.length === 1 ? "" : "s"}</Typography>
        <Typography variant="caption" color="text.secondary">Source: UN Human Rights Council · A/HRC/60/8</Typography>
      </Stack>

      <Paper variant="outlined" square>
        {visible.map((c, index) => (
          <Box key={c.id}>
            {index > 0 && <Divider />}
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 3 }} sx={{ px: { xs: 2.25, md: 3 }, py: { xs: 2.5, md: 3 } }}>
              <Box sx={{ width: { md: 112 }, flexShrink: 0 }}>
                <Typography variant="overline" color="text.secondary">Recommendation</Typography>
                <Typography variant="h6" color="primary.main" sx={{ mt: .15 }}>{c.recommendation_number || c.public_id}</Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.1 }}>
                  <StatusChip status={c.assessment_status} />
                  <Typography variant="caption" sx={{ px: 1, py: .35, border: "1px solid", borderColor: "divider", color: "text.secondary" }}>{c.acceptance_status === "accepted" ? "Accepted by Spain" : c.acceptance_status === "noted" ? "Noted by Spain" : (c.acceptance_status || "State response pending")}</Typography>
                </Stack>
                <Typography variant="h5" color="primary.main" sx={{ mb: 1 }}>{c.title}</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 860 }}>
                  {c.normalized_summary || c.original_text}
                </Typography>
              </Box>

              <Box sx={{ width: { md: 145 }, flexShrink: 0, display: "flex", alignItems: { md: "center" }, justifyContent: { md: "flex-end" } }}>
                <Button component={Link} href={`/commitments/${encodeURIComponent(c.public_id)}`} endIcon={<OpenInNewRoundedIcon fontSize="small" />}>
                  Open record
                </Button>
              </Box>
            </Stack>
          </Box>
        ))}

        {!visible.length && (
          <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
            <Typography variant="h6" color="primary.main">No recommendations match these filters</Typography>
            <Typography color="text.secondary" sx={{ mt: .75 }}>Try a broader search or clear one of the filters.</Typography>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
