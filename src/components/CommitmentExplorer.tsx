"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Card, CardContent, Chip, FormControl, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import type { Commitment } from "@/lib/hrct";
import { StatusChip } from "./StatusChip";

export function CommitmentExplorer({ commitments }: { commitments: Commitment[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mechanism, setMechanism] = useState("all");

  const mechanisms = useMemo(() => [...new Set(commitments.map((x) => x.mechanism_code).filter(Boolean))], [commitments]);
  const visible = useMemo(() => commitments.filter((c) => {
    const text = `${c.public_id} ${c.title} ${c.original_text} ${c.country_name}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || c.assessment_status === status) && (mechanism === "all" || c.mechanism_code === mechanism);
  }), [commitments, query, status, mechanism]);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commitments, recommendation numbers or keywords"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl sx={{ minWidth: 210 }}>
          <InputLabel id="status-filter">Assessment</InputLabel>
          <Select labelId="status-filter" label="Assessment" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">All assessments</MenuItem>
            <MenuItem value="implemented">Implemented</MenuItem>
            <MenuItem value="substantially_implemented">Substantial progress</MenuItem>
            <MenuItem value="limited_progress">Limited progress</MenuItem>
            <MenuItem value="not_implemented">No implementation</MenuItem>
            <MenuItem value="regressed">Regressed</MenuItem>
            <MenuItem value="unable_to_assess">Insufficient evidence</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="mechanism-filter">Mechanism</InputLabel>
          <Select labelId="mechanism-filter" label="Mechanism" value={mechanism} onChange={(e) => setMechanism(e.target.value)}>
            <MenuItem value="all">All mechanisms</MenuItem>
            {mechanisms.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="body2" color="text.secondary">{visible.length} public commitment{visible.length === 1 ? "" : "s"}</Typography>

      <Stack spacing={2}>
        {visible.map((c) => (
          <Card key={c.id}>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, "&:last-child": { pb: { xs: 2.5, md: 3.5 } } }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2.5}>
                <Box sx={{ maxWidth: 780 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.6 }}>
                    <Chip size="small" label={c.country_name} variant="outlined" />
                    <Chip size="small" label={c.mechanism_code} variant="outlined" />
                    <StatusChip status={c.assessment_status} />
                  </Stack>
                  <Typography variant="overline" color="secondary.main" fontWeight={700}>{c.public_id}</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: .25, mb: 1 }}>{c.title}</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {c.normalized_summary || c.original_text}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                  <Button component={Link} href={`/commitments/${encodeURIComponent(c.public_id)}`} endIcon={<ArrowForwardRoundedIcon />}>View evidence</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {!visible.length && (
        <Box sx={{ textAlign: "center", py: 8, border: "1px dashed", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
          <Typography variant="h6">No commitments match these filters</Typography>
          <Typography color="text.secondary">Try a broader search or clear one of the filters.</Typography>
        </Box>
      )}
    </Stack>
  );
}
