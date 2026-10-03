import {canonicalUrl,sourceInfo} from '../core.ts';
const media=['rtve.es','efe.com','europapress.es','elpais.com','elmundo.es','eldiario.es','lavanguardia.com','reuters.com','apnews.com','bbc.com','bbc.co.uk'];
// Fetch only curated publishers and verify institutional references. Never follow arbitrary redirects.
export async function findOriginal(raw:string):Promise<string|null>{
 const url=canonicalUrl(raw);if(!url)return null;const host=new URL(url).hostname;
 if(!media.some(h=>host===h||host.endsWith('.'+h)))return null;
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(4000)});
 if(!r.ok||!r.headers.get('Content-Type')?.includes('text/html'))return null;
 const reader=r.body?.getReader();if(!reader)return null;const decoder=new TextDecoder();let html='';
 try{while(html.length<300000){const {value,done}=await reader.read();if(done)break;html+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
 const candidates=[...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map(m=>canonicalUrl(m[1].replaceAll('&amp;','&'))).filter((s):s is string=>!!s&&sourceInfo(s).source_tier<=2&&new URL(s).pathname!=='/');
 // Multiple institutional references could point to unrelated documents; retain ambiguity.
 const unique=[...new Set(candidates)];if(unique.length!==1)return null;
 const target=unique[0];const response=await fetch(target,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(4000)});
 return response.ok?target:null;
}
