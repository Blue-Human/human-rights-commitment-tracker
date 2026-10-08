import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { brand } from "@/brand";
import { formatDate } from "@/lib/hrct";
import { sdgGoal, targetText, UHRI_URL, type SdgLink } from "@/lib/sdg";
import { SdgIcon } from "./SdgIcon";

const others = (n: number) => (n === 1 ? "1 recomendación más" : `${n} recomendaciones más`);

// The goals of the 2030 Agenda related to one recommendation, each with its related targets only,
// and how many other recommendations contribute to the same target. `links` are those of the
// whole catalogue.
export function RecommendationSdgs({ publicId, links }: { publicId: string; links: SdgLink[] | null }) {
  const rest = (links || []).filter((link) => link.public_id !== publicId);
  const linked = (links || []).filter((link) => link.public_id === publicId).sort((a, b) => a.goal - b.goal).flatMap((link) => {
    const goal = sdgGoal(link.goal);
    return goal ? [{ goal, targets: link.targets, rationale: link.rationale, peers: rest.filter((other) => other.goal === link.goal).length }] : [];
  });
  const peersOf = (code: string) => rest.filter((other) => other.targets.includes(code)).length;
  const reviewed = formatDate(links?.find((link) => link.reviewed_at)?.reviewed_at);

  return (
    <Box component="section" id="ods" aria-labelledby="sdg-heading">
      <Typography variant="overline" color="text.secondary">Agenda 2030</Typography>
      <Typography id="sdg-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Objetivos de Desarrollo Sostenible y metas</Typography>

      {links === null && <Typography variant="body2" color="text.secondary">No se han podido cargar los ODS de esta recomendación.</Typography>}

      {links !== null && !linked.length && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.7 }}>
          HRCT no relaciona esta recomendación con ningún Objetivo de Desarrollo Sostenible: su contenido no corresponde a ninguna meta de la Agenda 2030.
        </Typography>
      )}

      {linked.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 840, lineHeight: 1.7 }}>
            Cumplir esta recomendación contribuye a {linked.length === 1 ? "este objetivo" : `estos ${linked.length} objetivos`} de la Agenda 2030.
          </Typography>
          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
            {linked.map(({ goal, targets, rationale, peers }) => (
              <Box key={goal.number} sx={{ display: "grid", gridTemplateColumns: { xs: "88px minmax(0,1fr)", sm: "132px minmax(0,1fr)" }, columnGap: { xs: 2, sm: 4 }, alignItems: "start", py: 3, borderBottom: "1px solid", borderColor: "divider" }}>
                <Box component={Link} href={`/ods/${goal.number}`} sx={{ display: "block", "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 3 } }}>
                  <SdgIcon goal={goal} sizes="132px" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "baseline" }} spacing={{ xs: .5, sm: 2 }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ display: "block", borderLeft: `3px solid ${goal.color}`, pl: 1.25, lineHeight: 1.5 }}>Objetivo {goal.number}</Typography>
                      <Typography variant="h6" color="primary.main" sx={{ mt: .5, lineHeight: 1.3 }}>{goal.name}</Typography>
                    </Box>
                    <Button component={Link} href={`/ods/${goal.number}`} endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 0, flexShrink: 0 }}>
                      {peers ? `${others(peers)} en este objetivo` : "Ver el objetivo"}
                    </Button>
                  </Stack>
                  {rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: .75, maxWidth: 720, lineHeight: 1.6 }}>{rationale}</Typography>}
                  {targets.length > 0 ? (
                    <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0 }}>
                      {targets.map((code) => {
                        const peersOfTarget = peersOf(code);
                        return (
                          <Box component="li" key={code} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "84px minmax(0,1fr)" }, columnGap: 1.5, rowGap: .25, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>Meta {code}</Typography>
                            <Box>
                              <Typography variant="body2" sx={{ lineHeight: 1.7, maxWidth: 720 }}>{targetText(code) || "Meta no disponible."}</Typography>
                              {peersOfTarget > 0 && (
                                <Typography component={Link} href={`/ods/${goal.number}#meta-${code}`} variant="caption" sx={{ display: "inline-block", mt: { xs: 0, md: .5 }, py: { xs: 1.25, md: 0 }, color: "secondary.dark", fontWeight: 500, textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                                  {others(peersOfTarget)} {peersOfTarget === 1 ? "contribuye" : "contribuyen"} a esta meta
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>Relacionada con el objetivo en su conjunto, sin una meta concreta.</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}

      {links !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, maxWidth: 840, lineHeight: 1.6 }}>
          Clasificación de HRCT a partir del texto oficial de la recomendación{reviewed ? ` (revisión del ${reviewed})` : ""}, con el <Box component="a" href={UHRI_URL} target="_blank" rel="noreferrer" sx={{ color: "inherit" }}>Índice Universal de los Derechos Humanos</Box> (ACNUDH) como referencia. Texto de las metas: resolución A/RES/70/1 de la Asamblea General.
        </Typography>
      )}
    </Box>
  );
}
