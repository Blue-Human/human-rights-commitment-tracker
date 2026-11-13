import Link from "next/link";
import type { SvgIconComponent } from "@mui/icons-material";
import AccessibleRounded from "@mui/icons-material/AccessibleRounded";
import BalanceRounded from "@mui/icons-material/BalanceRounded";
import ChildCareRounded from "@mui/icons-material/ChildCareRounded";
import Diversity3Rounded from "@mui/icons-material/Diversity3Rounded";
import FamilyRestroomRounded from "@mui/icons-material/FamilyRestroomRounded";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import FemaleRounded from "@mui/icons-material/FemaleRounded";
import GavelRounded from "@mui/icons-material/GavelRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import HandshakeRounded from "@mui/icons-material/HandshakeRounded";
import HealthAndSafetyRounded from "@mui/icons-material/HealthAndSafetyRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import PanToolRounded from "@mui/icons-material/PanToolRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import RecordVoiceOverRounded from "@mui/icons-material/RecordVoiceOverRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SupportRounded from "@mui/icons-material/SupportRounded";
import VolunteerActivismRounded from "@mui/icons-material/VolunteerActivismRounded";
import WorkRounded from "@mui/icons-material/WorkRounded";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { rightPath } from "@/lib/atlas/labels";
import type { Right } from "@/lib/atlas/types";

// A pictogram per right, to find it at a glance. Decorative: the name of the right is always shown.
const icons: Record<string, SvgIconComponent> = {
  vida: FavoriteBorderRounded,
  tortura: PanToolRounded,
  "libertad-personal": LockOpenRounded,
  garantias: GavelRounded,
  justicia: BalanceRounded,
  "vida-privada": FamilyRestroomRounded,
  pensamiento: PsychologyRounded,
  expresion: RecordVoiceOverRounded,
  reunion: GroupsRounded,
  asociacion: HandshakeRounded,
  igualdad: Diversity3Rounded,
  educacion: SchoolRounded,
  salud: HealthAndSafetyRounded,
  trabajo: WorkRounded,
  "seguridad-social": VolunteerActivismRounded,
  vivienda: HomeRounded,
  infancia: ChildCareRounded,
  discapacidad: AccessibleRounded,
  mujeres: FemaleRounded,
  desaparicion: PersonSearchRounded,
  esclavitud: LinkOffRounded,
  asilo: SupportRounded,
};

export function rightCounts(r: Right) {
  return {
    articles: new Set(r.articles.map((a) => `${a.instrument}:${a.article}`)).size,
    instruments: new Set([...r.articles.map((a) => a.instrument), ...r.instruments.map((i) => i.instrument)]).size,
    interpretations: r.interpretations.length,
  };
}

// The rights of the Atlas as a grid of doors. «compact» drops the counts, for the home page.
export function RightTiles({ rights, compact = false }: { rights: Right[]; compact?: boolean }) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: compact ? "repeat(4,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" }, borderTop: "1px solid", borderLeft: "1px solid", borderColor: "divider" }}>
      {rights.map((r) => {
        const Icon = icons[r.id] || MenuBookRounded;
        const n = rightCounts(r);
        const line = [n.articles && `${n.articles} artículos`, n.instruments && `${n.instruments} instrumentos`, n.interpretations && `${n.interpretations} observaciones`].filter(Boolean).join(" · ");
        return (
          <Box component="li" key={r.id} sx={{ display: "flex", borderRight: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
            <Box component={Link} href={rightPath(r.id)} sx={{ display: "flex", flexDirection: "column", gap: 1.25, width: "100%", p: { xs: 1.75, md: 2.25 }, minHeight: compact ? { xs: 118, md: 128 } : { xs: 140, md: 150 }, color: "inherit", textDecoration: "none", transition: "background-color .15s", "&:hover": { bgcolor: brand.accentSoft, "& .ic": { color: brand.accentInk, transform: "scale(1.06)" } }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 } }}>
              <Icon className="ic" aria-hidden sx={{ fontSize: { xs: 28, md: 32 }, color: brand.navy, transition: "color .15s, transform .15s" }} />
              <Typography component="h3" color="primary.main" sx={{ fontWeight: 500, fontSize: { xs: ".9rem", md: "1rem" }, lineHeight: 1.3 }}>{r.name}</Typography>
              {!compact && <Typography variant="caption" color="text.secondary" sx={{ mt: "auto" }}>{line || "Sin vínculos documentados todavía"}</Typography>}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
