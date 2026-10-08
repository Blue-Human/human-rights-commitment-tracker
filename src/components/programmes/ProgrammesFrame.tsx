import Link from 'next/link';
import { Stack, Button, Typography } from '@mui/material';
import { AdminFrame } from '@/components/AdminFrame';
import { navigation,rootPath } from '@/lib/programmes/model';
export function ProgrammesFrame({title,intro,section='',children}:{title:string;intro?:string;section?:string;children:React.ReactNode}) {
  return <AdminFrame title={title} intro={intro}>
    <Stack component="nav" aria-label="Programas" direction="row" spacing={1} useFlexGap sx={{overflowX:'auto',mb:3,pb:1,'& > *':{flexShrink:0}}}>
      {navigation.map(([path,label])=><Button key={path} component={Link} href={`${rootPath}${path?`/${path}`:''}`} aria-current={section===path?'page':undefined} variant={section===path?'contained':'text'} size="small">{label}</Button>)}
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{mb:3,maxWidth:880}}>Área interna de Blue Human. Las relaciones con compromisos documentan pertinencia y contribución; las valoraciones estatales conservan su revisión independiente.</Typography>
    {children}
  </AdminFrame>;
}
