import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Stack, Typography } from "@mui/material";

export type LinkBlock = {
  title: string;
  text: string;
  // Where the block leads. An address that starts with "/" stays on the site.
  links: { label: string; href: string }[];
};

// Short blocks that each say one thing and lead somewhere: a page of the site, another site or an e-mail address.
export function LinkBlocks({ blocks, columns = 3 }: { blocks: LinkBlock[]; columns?: 2 | 3 }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: `repeat(${columns},minmax(0,1fr))` }, columnGap: 6, rowGap: 5 }}>
      {blocks.map((block) => (
        <Box component="section" key={block.title} sx={{ display: "flex", flexDirection: "column", pt: 2.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
          <Typography variant="h5" component="h2" color="primary.main">{block.title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.25, mb: 2, lineHeight: 1.7 }}>{block.text}</Typography>
          <Stack alignItems="flex-start" sx={{ mt: "auto" }}>
            {block.links.map(({ label, href }) => {
              const internal = href.startsWith("/");
              const mail = href.startsWith("mailto:");
              return (
                <Button
                  key={href}
                  component={internal ? Link : "a"}
                  href={href}
                  {...(!internal && !mail && { target: "_blank", rel: "noreferrer" })}
                  endIcon={mail ? undefined : internal ? <ArrowForwardRoundedIcon /> : <OpenInNewRoundedIcon />}
                  sx={{ px: 0, textAlign: "left", "& .MuiButton-endIcon svg": { fontSize: 18 } }}
                >
                  {label}
                </Button>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
