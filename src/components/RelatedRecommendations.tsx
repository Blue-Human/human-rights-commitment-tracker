"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { brand } from "@/brand";

// On a phone a long list starts with this many numbers; the rest open on request.
const FIRST = 8;

// The recommendations a monitoring item relates to. A line of links on a wide screen; on a phone or
// a tablet, compact numbers that a finger can hit, since one item may relate to twenty recommendations.
// `related` carries each public id with the number to show for it.
export function RelatedRecommendations({ related }: { related: { id: string; number: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = related.length - FIRST;
  return (
    <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} flexWrap="wrap" useFlexGap alignItems={{ xs: "center", md: "baseline" }} sx={{ mt: 1.2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: { xs: "100%", md: "auto" } }}>
        Relacionada con<Box component="span" sx={{ display: { md: "none" } }}> {related.length === 1 ? "la recomendación" : "las recomendaciones"}</Box>
      </Typography>
      {related.map(({ id, number }, index) => (
        <Typography
          key={id}
          component={Link}
          href={`/commitments/${encodeURIComponent(id)}`}
          aria-label={`Recomendación ${number}`}
          variant="caption"
          color="primary.main"
          sx={{
            fontWeight: 600,
            display: { xs: index < FIRST || expanded ? "inline-flex" : "none", md: "inline" },
            alignItems: "center", justifyContent: "center",
            minWidth: { xs: 56, md: 0 }, minHeight: { xs: 40, md: 0 }, px: { xs: 1, md: 0 },
            border: { xs: `1px solid ${brand.border}`, md: 0 },
            textDecoration: { xs: "none", md: "underline" },
            fontSize: { xs: ".85rem", md: ".75rem" },
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>Recomendación&nbsp;</Box>{number}
        </Typography>
      ))}
      {hidden > 0 && (
        <Button size="small" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} sx={{ display: { md: "none" }, minHeight: 40 }}>
          {expanded ? "Ver menos" : `Ver ${hidden} más`}
        </Button>
      )}
    </Stack>
  );
}
