import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/session';
import { loadWorkspace } from '@/lib/admin/programmes';
import { entityFor } from '@/lib/programmes/model';
import { ProgrammesFrame } from '@/components/programmes/ProgrammesFrame';
import { EntityTable } from '@/components/programmes/EntityTable';
import { AdminSection } from '@/components/AdminFrame';
export default async function ProgrammeDirectory({params}:{params:Promise<{section:string}>}) {
  await requireAdmin();const {section}=await params;
  const entity=entityFor(section);if(!entity&&section!=='results')notFound();
  const data=await loadWorkspace();
  return <ProgrammesFrame title={entity?.title||'Resultados'} section={section} intro={entity?.description}>
    {section==='results'?['objectives','outcomes','outputs','output-outcomes'].map(s=><AdminSection key={s} title={entityFor(s)!.title}><EntityTable section={s} data={data}/></AdminSection>):<EntityTable section={section} data={data} hideCreate={section==='measurements'}/>}
  </ProgrammesFrame>;
}
