import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Portal de partners | Blue Human', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';
export default function PartnerLayout({ children }: { children: React.ReactNode }) { return children; }
