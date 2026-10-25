import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { requirePartner, partnerProjects } from '@/lib/partners/server';
import { projectStatuses } from '@/lib/programmes/model';
import { PartnerFrame } from '@/components/partners/PartnerFrame';
export default async function Projects() {
  const account = await requirePartner(), projects = await partnerProjects(account);
  return <PartnerFrame title="Mis proyectos">
    <Typography color="text.secondary">Hola, {account.display_name}. Estos son los proyectos compartidos con tu organización.</Typography>
    {!projects.length && <Typography sx={{ mt: 4 }}>Aún no tienes proyectos disponibles. Tu contacto de Blue Human puede activar el acceso.</Typography>}
    {projects.map(project => <Box key={project.id} sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="overline">{project.project_code} · {project.country}</Typography>
      <Typography variant="h2" sx={{ fontSize: '1.4rem' }}>{project.title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{projectStatuses[project.status as keyof typeof projectStatuses]}</Typography>
      {project.public_summary && <Typography sx={{ mt: 1 }}>{project.public_summary}</Typography>}
      <Button component={Link} href={`/partners/projects/${project.id}`} variant="outlined" sx={{ mt: 2 }}>Abrir proyecto</Button>
    </Box>)}
  </PartnerFrame>;
}
