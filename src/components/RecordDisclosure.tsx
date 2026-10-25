import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

// Native disclosures keep the full public record accessible without adding page-level sections.
export function RecordDisclosure({ title, count, open=false, children }: { title:string;count?:number;open?:boolean;children:ReactNode }) {
  return <Box component="details" open={open} sx={{
    borderTop:'1px solid',borderColor:'divider',
    '& > summary':{cursor:'pointer',py:2,color:'primary.main',fontWeight:500,
      '&::marker':{color:'secondary.dark'},'&:hover':{bgcolor:'rgba(0,163,224,.05)'},
      '&:focus-visible':{outline:'2px solid currentColor',outlineOffset:3}},
    '&[open] > summary':{borderBottom:'1px solid',borderColor:'divider'},
  }}>
    <summary>{title}{count!==undefined && <Typography component="span" variant="caption" color="text.secondary" sx={{ml:1.5}}>{count}</Typography>}</summary>
    <Box sx={{py:2.5}}>{children}</Box>
  </Box>;
}
