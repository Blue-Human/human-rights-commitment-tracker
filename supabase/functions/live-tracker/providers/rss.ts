import { XMLParser } from 'npm:fast-xml-parser@5.3.8';
import {parseDate,type Discovery} from '../core.ts';
// Feeds are deployment configuration, never URLs supplied by source content.
const allowed=new Set(['www.boe.es','boe.es','www.defensordelpueblo.es','defensordelpueblo.es','www.ohchr.org','ohchr.org','www.rtve.es','rtve.es','www.ine.es','ine.es']);
export async function rss(feed:string):Promise<Discovery[]>{
 const u=new URL(feed);if(u.protocol!=='https:'||!allowed.has(u.hostname)||u.username||u.password||u.port)throw new Error('RSS host not allowed');
 const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`RSS HTTP ${r.status}`);
 const text=await r.text();if(text.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Unsafe or oversized RSS');
 const data=new XMLParser({ignoreAttributes:false}).parse(text);
 const rows=data.rss?.channel?.item||data.feed?.entry||[];
 return (Array.isArray(rows)?rows:[rows]).slice(0,40).flatMap((row)=>{
 const links=Array.isArray(row.link)?row.link:[row.link];const link=links.find((l:any)=>typeof l==='string'||!l?.['@_rel']||l?.['@_rel']==='alternate');
 const url=typeof link==='string'?link:link?.['@_href'];const title=typeof row.title==='string'?row.title:row.title?.['#text'];
 if(!url||!title)return [];
 return [{url,title,publishedAt:parseDate(row.pubDate||row.published||row.updated),provider:'rss'}];
 });
}
