import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/session';
export const metadata:Metadata={title:'Programmes | Blue Human',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function ProgrammesLayout({children}:{children:React.ReactNode}) {
  await requireAdmin();return children;
}
