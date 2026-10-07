import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { Providers } from "./providers";
import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter';
import { brand } from "@/brand";

const ibm = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
// The serif of the same family, for the headline of the home page.
const serif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Human Rights Commitment Institute | Blue Human",
  description: "Seguimiento público y basado en evidencias de los compromisos de derechos humanos de España.",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
};

// The page reaches the edges of a notched phone; the theme keeps the content clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: brand.navy,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${ibm.className} ${serif.variable}`}>
        <AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider>
      </body>
    </html>
  );
}
