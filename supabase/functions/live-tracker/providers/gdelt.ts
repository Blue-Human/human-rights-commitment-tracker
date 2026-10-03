import {parseDate, type Discovery} from '../core.ts';
export type Provider = {name:string;discover(query:string,days:number):Promise<Discovery[]>};
export const gdelt:Provider={name:'gdelt',async discover(query,days){
 const u=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
 for(const [k,v] of Object.entries({query,mode:'artlist',maxrecords:'15',format:'json',sort:'datedesc',timespan:`${Math.min(90,Math.max(1,days))}d`}))u.searchParams.set(k,v);
 const r=await fetch(u,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'BlueHuman-HRCT/2.0 (+https://bluehuman.org)'}});
 if(!r.ok)throw new Error(`GDELT HTTP ${r.status}`);
 const data=await r.json();if(!data||(!Array.isArray(data.articles)&&Object.keys(data).length>0))throw new Error('Invalid GDELT response');
 return (data.articles||[]).filter((a:Record<string,string>)=>a.url&&a.title).map((a:Record<string,string>)=>({url:a.url,title:a.title,observedAt:parseDate(a.seendate),publishedAt:null,language:a.language,provider:'gdelt'}));
}};
