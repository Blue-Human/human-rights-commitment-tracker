import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter';
import { brand } from "@/brand";

const ibm = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
// TWK Everett (web licence from Weltkern), unmodified: titles, the logo and a few points of emphasis.
// Light only sets the second line of the logo; the text of the site stays in IBM Plex Sans.
const display = localFont({
  src: [
    { path: "./fonts/TWKEverett-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/TWKEverett-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/TWKEverett-Medium.otf", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display",
  fallback: ["IBM Plex Sans", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Human Rights Commitment Institute | Blue Human",
  description: "Seguimiento público y basado en evidencias de los compromisos de derechos humanos de España.",
  icons: {
    icon: { url: "/images/blue%20human%20(9).png?v=bh9", type: "image/png", sizes: "335x324" },
    apple: { url: "/images/blue%20human%20(9).png?v=bh9", type: "image/png" },
  },
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
      <body className={`${ibm.className} ${display.variable}`}>
        <AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider>
      </body>
    </html>
  );
}
