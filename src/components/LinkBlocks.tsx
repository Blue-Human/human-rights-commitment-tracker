import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Stack, Typography } from "@mui/material";

export type LinkBlock = {
  title: string;
  text?: string;
  // Where the block leads. An address that starts with "/" stays on the site.
  links: { label: string; href: string }[];
};

// Short blocks that each say one thing and lead somewhere: a page of the site, another site or an e-mail address.
// `dense` is for a column beside something else: smaller type and less air between the blocks.
export function LinkBlocks({ blocks, columns = 3, dense = false }: { blocks: LinkBlock[]; columns?: 1 | 2 | 3; dense?: boolean }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: `repeat(${columns},minmax(0,1fr))` }, columnGap: 6, rowGap: dense ? 2.5 : 5 }}>
      {blocks.map((block) => (
        <Box component="section" key={block.title} sx={{ display: "flex", flexDirection: "column", pt: dense ? 1.5 : 2.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
          <Typography variant={dense ? "h6" : "h5"} component="h2" color="primary.main" sx={dense ? { fontSize: "1.0625rem", lineHeight: 1.4 } : undefined}>{block.title}</Typography>
          {block.text && <Typography variant={dense ? "body2" : "body1"} color="text.secondary" sx={dense ? { mt: .5, lineHeight: 1.6 } : { mt: 1.25, mb: 2, lineHeight: 1.7 }}>{block.text}</Typography>}
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
                  sx={{ px: 0, textAlign: "left", "& .MuiButton-endIcon svg": { fontSize: 18 }, ...(dense && { "@media (pointer: fine)": { minHeight: 32 } }) }}
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
