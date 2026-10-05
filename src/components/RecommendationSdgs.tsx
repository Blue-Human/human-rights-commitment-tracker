import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import { formatDate } from "@/lib/hrct";
import { sdgGoal, targetText, UHRI_URL, type SdgLink } from "@/lib/sdg";
import { SdgIcon } from "./SdgIcon";

// The goals of the 2030 Agenda related to one recommendation, each with its related targets only.
export function RecommendationSdgs({ links }: { links: SdgLink[] | null }) {
  const linked = (links || []).flatMap((link) => {
    const goal = sdgGoal(link.goal);
    return goal ? [{ goal, targets: link.targets }] : [];
  });
  const published = formatDate(links?.find((link) => link.source_published_at)?.source_published_at);

  return (
    <Box component="section" id="ods" aria-labelledby="sdg-heading">
      <Typography variant="overline" color="text.secondary">Agenda 2030</Typography>
      <Typography id="sdg-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Objetivos de Desarrollo Sostenible y metas</Typography>

      {links === null && <Typography variant="body2" color="text.secondary">No se han podido cargar los ODS de esta recomendación.</Typography>}

      {links !== null && !linked.length && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.7 }}>
          El Índice Universal de los Derechos Humanos de las Naciones Unidas no relaciona esta recomendación con ningún Objetivo de Desarrollo Sostenible.
        </Typography>
      )}

      {linked.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 840, lineHeight: 1.7 }}>
            Objetivos y metas de la Agenda 2030 con los que las Naciones Unidas relacionan esta recomendación. Avanzar en su cumplimiento contribuye también a alcanzarlos.
          </Typography>
          <Stack spacing={3}>
            {linked.map(({ goal, targets }) => (
              <Box key={goal.number} sx={{ display: "grid", gridTemplateColumns: { xs: "88px minmax(0,1fr)", sm: "128px minmax(0,1fr)" }, columnGap: { xs: 2, sm: 3 }, alignItems: "start" }}>
                <Box component={Link} href={`/ods/${goal.number}`} sx={{ display: "block", "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.dark", outlineOffset: 3 } }}>
                  <SdgIcon goal={goal} sizes="128px" />
                </Box>
                <Box sx={{ minWidth: 0, pl: { xs: 0, sm: 3 }, borderLeft: { sm: `3px solid ${goal.color}` } }}>
                  <Typography variant="overline" color="text.secondary">Objetivo {goal.number}</Typography>
                  <Typography variant="h6" color="primary.main" sx={{ lineHeight: 1.3 }}>{goal.name}</Typography>
                  {targets.length > 0 ? (
                    <Stack component="ul" spacing={1.25} sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0 }}>
                      {targets.map((code) => (
                        <Box component="li" key={code} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "84px minmax(0,1fr)" }, columnGap: 1.5 }}>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>Meta {code}</Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.7, maxWidth: 720 }}>{targetText(code) || "Meta no disponible."}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>Relacionada con el objetivo en su conjunto, sin una meta concreta.</Typography>
                  )}
                  <Button component={Link} href={`/ods/${goal.number}`} sx={{ mt: 1, px: 0 }}>Ver el ODS {goal.number} y sus recomendaciones</Button>
                </Box>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {links !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3, maxWidth: 840, lineHeight: 1.6 }}>
          Vinculación: <Box component="a" href={UHRI_URL} target="_blank" rel="noreferrer" sx={{ color: "inherit" }}>Índice Universal de los Derechos Humanos</Box> (ACNUDH){published ? `, publicada el ${published}` : ""}. Texto de las metas: resolución A/RES/70/1 de la Asamblea General.
        </Typography>
      )}
    </Box>
  );
}
