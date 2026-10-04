import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Providers } from "./providers";

const ibm = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Human Rights Commitment Tracker | Blue Human",
  description: "Seguimiento público y basado en evidencias de los compromisos de derechos humanos de España.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={ibm.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
