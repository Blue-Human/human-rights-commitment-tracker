import Link from "next/link";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { brand } from "@/brand";
import { channelLabels, developmentPath, formatDate, monitoringChannel, reviewLabel, type Development, type MonitoringChannel } from "@/lib/hrct";

// What a card needs from a development; the explorer sends only this to the browser.
export type CardItem = Pick<Development, "slug" | "kind" | "relation" | "title" | "publisher" | "source_domain" | "source_type" | "published_at" | "summary" | "excerpt" | "status" | "public_ids">;

// One colour per channel, so that context, possible progress and contrary developments are told apart at a glance.
export const channelTones: Record<MonitoringChannel, string> = { need: brand.navy, implementation: brand.accent, contradiction: "#963b34" };

const sourceIcons: Record<string, typeof ArticleOutlinedIcon> = {
  news: ArticleOutlinedIcon,
  official_web: AccountBalanceOutlinedIcon,
  legislation: GavelRoundedIcon,
  official_gazette: GavelRoundedIcon,
  un_body: PublicRoundedIcon,
  civil_society: GroupsOutlinedIcon,
};

export function SourceIcon({ type, size = 16 }: { type: string; size?: number }) {
  const Icon = sourceIcons[type] || ArticleOutlinedIcon;
  return <Icon aria-hidden sx={{ fontSize: size, flexShrink: 0 }} />;
}

export function ChannelLabel({ channel, onDark = false, prefix }: { channel: MonitoringChannel; onDark?: boolean; prefix?: string }) {
  return (
    <Typography variant="overline" sx={{ display: "flex", alignItems: "center", gap: 1, lineHeight: 1.5, color: onDark ? "rgba(255,255,255,.78)" : "text.secondary" }}>
      <Box aria-hidden sx={{ width: 8, height: 8, flexShrink: 0, bgcolor: onDark && channel === "need" ? "#fff" : channelTones[channel] }} />
      {prefix ? `${prefix} · ` : ""}{channelLabels[channel]}
    </Typography>
  );
}

export const sourceName = (item: Pick<Development, "publisher" | "source_domain">) => item.publisher || item.source_domain || "Fuente sin identificar";
export const relatedCount = (n: number) => `${n} ${n === 1 ? "recomendación relacionada" : "recomendaciones relacionadas"}`;

const clamp = (lines: number) => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }) as const;
// A summary when there is one; otherwise the words of the source, marked as a quotation.
const cardText = (item: CardItem) => item.summary || (item.excerpt ? `«${item.excerpt}»` : null);

function Dateline({ item }: { item: CardItem }) {
  const date = formatDate(item.published_at);
  return date ? <Box component="time" dateTime={item.published_at!.slice(0, 10)} sx={{ whiteSpace: "nowrap" }}>{date}</Box> : null;
}

type Props = {
  item: CardItem;
  // "lead" opens the page; "row" is the compact line next to it; "card" fills the grid.
  variant?: "card" | "lead" | "row";
  heading?: "h2" | "h3";
};

// A development as a headline that opens its own page. HRCT links the source; it does not reproduce it.
export function MonitoringCard({ item, variant = "card", heading = "h3" }: Props) {
  const channel = monitoringChannel(item);
  const text = cardText(item);
  const href = developmentPath(item);

  if (variant === "lead") {
    return (
      <Box component="article" sx={{ height: "100%", bgcolor: "primary.main", color: "#fff" }}>
        <CardActionArea component={Link} href={href} sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", p: { xs: 2.5, sm: 3.5, md: 4.5 }, "&.Mui-focusVisible": { outlineColor: "#fff", outlineOffset: -5 }, "&:hover .hrct-card-go": { color: "#fff" }, "&:hover .hrct-card-go svg": { transform: "translateX(4px)" } }}>
          <ChannelLabel channel={channel} onDark prefix="Lo último" />
          <Typography component={heading} sx={{ mt: { xs: 2, md: 2.5 }, fontSize: { xs: "1.45rem", sm: "1.75rem", md: item.title.length > 150 ? "1.6rem" : "2.1rem" }, fontWeight: 500, lineHeight: 1.18, letterSpacing: "-.018em", ...clamp(7) }}>{item.title}</Typography>
          {text && <Typography sx={{ mt: 2, maxWidth: 620, lineHeight: 1.65, color: "rgba(255,255,255,.82)", ...clamp(3) }}>{text}</Typography>}
          <Box sx={{ mt: "auto", pt: { xs: 3, md: 5 } }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 3, rowGap: 1.25, pt: 2, borderTop: "1px solid rgba(255,255,255,.16)" }}>
              <Typography variant="body2" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, color: "rgba(255,255,255,.78)" }}>
                <SourceIcon type={item.source_type} />
                <Box component="span" sx={{ color: "#fff", fontWeight: 600 }}>{sourceName(item)}</Box>
                <Box component="span" aria-hidden>·</Box><Dateline item={item} />
                <Box component="span" aria-hidden>·</Box>{relatedCount(item.public_ids.length)}
              </Typography>
              <Typography className="hrct-card-go" variant="body2" sx={{ display: "flex", alignItems: "center", gap: .75, fontWeight: 500, color: "#9bdcf5", transition: "color .15s", "& svg": { fontSize: 18, transition: "transform .15s" } }}>
                Ver la novedad <ArrowForwardRoundedIcon aria-hidden />
              </Typography>
            </Box>
          </Box>
        </CardActionArea>
      </Box>
    );
  }

  if (variant === "row") {
    return (
      <Box component="article" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <CardActionArea component={Link} href={href} sx={{ display: "block", py: 2, "&:hover .hrct-card-title": { color: brand.accentInk }, "&:active": { bgcolor: { xs: "rgba(0,163,224,.09)", md: "transparent" } } }}>
          <ChannelLabel channel={channel} />
          <Typography className="hrct-card-title" component={heading} color="primary.main" sx={{ mt: .75, fontSize: "1.0625rem", fontWeight: 500, lineHeight: 1.35, transition: "color .15s", ...clamp(3) }}>{item.title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .75 }}>
            {sourceName(item)} · <Dateline item={item} />
          </Typography>
        </CardActionArea>
      </Box>
    );
  }

  return (
    <Card component="article" sx={{ height: "100%", transition: "border-color .15s", "&:hover": { borderColor: brand.accentInk }, "&:hover .hrct-card-title": { color: brand.accentInk } }}>
      <CardActionArea component={Link} href={href} sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", p: { xs: 2.25, md: 2.75 }, "&:active": { bgcolor: { xs: "rgba(0,163,224,.09)", md: "transparent" } } }}>
        <ChannelLabel channel={channel} />
        <Typography className="hrct-card-title" component={heading} color="primary.main" sx={{ mt: 1.25, fontSize: { xs: "1.0625rem", md: "1.125rem" }, fontWeight: 500, lineHeight: 1.35, transition: "color .15s", ...clamp(5) }}>{item.title}</Typography>
        {text && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.65, ...clamp(3) }}>{text}</Typography>}
        <Box sx={{ mt: "auto", pt: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider", color: "primary.main" }}>
            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: .75, minWidth: 0, fontWeight: 600 }}>
              <SourceIcon type={item.source_type} />
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceName(item)}</Box>
            </Typography>
            <Typography variant="caption" color="text.secondary"><Dateline item={item} /></Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .75, lineHeight: 1.5 }}>
            {relatedCount(item.public_ids.length)} · {reviewLabel(item)}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
