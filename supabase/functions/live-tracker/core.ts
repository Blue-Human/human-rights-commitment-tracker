export type Dimension = 'economic'|'food'|'health'|'environmental'|'personal'|'community'|'political';
export type Discovery = {url:string; title:string; summary?:string; publishedAt?:string|null; observedAt?:string|null; provider:string; language?:string; originalUrl?:string};
export type Profile = {id:string; commitment_id:string; news_query:string; implementation_query?:string|null; keywords?:string[]; lookback_days:number; enabled:boolean; queries_es?:string[];queries_en?:string[];commitments?:{title:string;original_text:string}};
const stop = new Set(['espana','spain','para','contra','sobre','desde','hasta','entre','como','that','with','from','this','their','rights','human','national','continue','strengthen','combat','ensure','adopt','efforts','measures','implementation','effective','gobierno','derechos','government','ministerio','minister','official','gob','domain','and','the','ley']);
export const normalize = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function tokens(s:string):string[]{return [...new Set((normalize(s).match(/[a-z]{3,}/g)||[]).filter(x=>!stop.has(x)))];}
export function canonicalUrl(raw:string):string|null {
 try {const u=new URL(raw); if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;
 const h=u.hostname.toLowerCase(); if(!h.includes('.')||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||/^\d+\.\d+\.\d+\.\d+$/.test(h)||h.includes(':'))return null;
 u.hash=''; for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(k))u.searchParams.delete(k);
 u.hostname=h.replace(/^www\./,'');u.searchParams.sort();return u.toString();}catch{return null;}
}
const concepts:Record<string,string[]>= {
 racism:['racismo','racism','racial','xenofobia','xenophobia'], hate:['odio','hate'], roma:['gitana','gitano','gitanos','roma'],
 housing:['vivienda','housing','desahucio','eviction','homeless'], migrants:['migrantes','migratorios','migracion','migracion','migrants','migrant','migration','immigration','inmigracion'],
 health:['salud','sanidad','health','healthcare'], gender:['genero','gender','mujeres','women'], disability:['discapacidad','disability','disabilities'],
 children:['infancia','menores','ninos','children','child'], detention:['prision','prisiones','prisons','detention','detencion','tortura','torture'],
 environment:['clima','climate','ambiental','environment','environmental'], food:['alimentacion','food','hambre','hunger'], poverty:['pobreza','poverty','ingresos','income'],
 expression:['expresion','expression','prensa','press'], labour:['trabajadores','workers','laboral','labour','employment'], trafficking:['trata','trafficking'],
 };
export function relevance(text:string,query:string){
 const a=new Set(tokens(text)), b=tokens(query);if(!b.length)return {score:0,rationale:'No specific monitoring terms.'};
 const matching=b.filter(w=>a.has(w)||Object.values(concepts).some(v=>v.includes(w)&&v.some(x=>a.has(x))));
 const value=matching.length/b.length;
 return {score:Math.round(value*1000)/1000,rationale:`Lexical/concept match: ${matching.join(', ')||'none'} (${matching.length}/${b.length} monitoring terms); not a calibrated probability.`};
}
export function dimensionsFor(text:string):Dimension[]{
 const t=normalize(text), out:Dimension[]=[];
 const rules:Record<Dimension,RegExp>={economic:/poverty|pobreza|housing|vivienda|employment|laboral|trabajador|social protection/,food:/food|aliment|hunger|hambre/,health:/health|salud|sanidad|disab|discap|reproduct/,environmental:/environment|ambient|climat|contamin/,personal:/violenc|hate|odio|tortur|deten|traffick|trata|abuse/,community:/racis|xenoph|xenof|discrimin|roma|gitano|gitana|minor|migran/,political:/politic|expression|expresion|assembly|asamblea|justice|justicia|deten|tortur|civil libert/};
 for(const [d,r] of Object.entries(rules))if(r.test(t))out.push(d as Dimension);return out;
}
const official=['boe.es','interior.gob.es','inclusion.gob.es','igualdad.gob.es','lamoncloa.gob.es','congreso.es','senado.es','poderjudicial.es','ine.es'];
export function sourceInfo(url:string){const host=new URL(url).hostname; const is=(d:string)=>host===d||host.endsWith('.'+d);
 if(is('ohchr.org')||is('un.org'))return {source_type:'un',source_tier:2};
 if(is('defensordelpueblo.es'))return {source_type:'nhri',source_tier:2};
 if(is('poderjudicial.es'))return {source_type:'court',source_tier:1};
 if(is('ine.es'))return {source_type:'statistics',source_tier:1};
 if(official.some(is))return {source_type:'official',source_tier:1};
 return {source_type:'media',source_tier:4};
}
// Only precise matching headlines in the same event time bucket are grouped automatically.
// Different headlines remain separate rather than inventing semantic event identity.
export async function clusterKey(title:string,at:string){const day=at.slice(0,10);const data=new TextEncoder().encode(`${day}|${normalize(title).replace(/[^a-z0-9]+/g,' ').trim()}`);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export function publicationDecision(d:Discovery,p:Profile,score:number,implementation:boolean,now=Date.now()){
 if(!p.enabled||implementation||score<.8||!canonicalUrl(d.url))return false;
 const host=new URL(d.url).hostname.replace(/^www\./,'');
 const curated=['rtve.es','efe.com','europapress.es','elpais.com','elmundo.es','eldiario.es','lavanguardia.com','reuters.com','apnews.com','bbc.com','bbc.co.uk'];
 if(sourceInfo(d.url).source_type==='media'&&!curated.some(h=>host===h||host.endsWith('.'+h)))return false;
 if(d.provider==='rss'&&!/espana|spain/.test(normalize(d.title))&&sourceInfo(d.url).source_tier===4)return false;
 const at=new Date(d.publishedAt||d.observedAt||'').getTime();
 return Number.isFinite(at)&&at<=now+300000&&at>=now-Math.min(90,Math.max(1,p.lookback_days))*86400000;
}
export function reviewReason(sourceType:string,score:number,implementation:boolean):string|null {
 return implementation&&['official','un','nhri','court','statistics'].includes(sourceType)&&score>=.8?'major_new_official_source':null;
}
export function safeEqual(a:string,b:string){if(!a||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0;}
export function parseDate(s?:string|null){if(!s)return null;const compact=s.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);const raw=compact?`${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`:s;const t=new Date(raw);return Number.isNaN(t.getTime())?null:t.toISOString();}

export function monitoringQueries(text:string,fallback:string){
 const t=new Set(tokens(text));
 const topics=Object.entries(concepts).filter(([,words])=>words.some(w=>t.has(w))).map(([topic])=>topic);
 const queryEs:string[]=[],queryEn:string[]=[];
 const terms:Record<string,[string,string]>={racism:['racismo discriminación racial','racism racial discrimination'],hate:['discurso de odio delitos de odio','hate speech hate crime'],roma:['discriminación población gitana','Roma discrimination'],housing:['vivienda desahucios','housing evictions'],migrants:['migrantes migración','migrants migration'],health:['salud sanidad','health healthcare'],gender:['violencia de género mujeres','gender violence women'],disability:['discapacidad accesibilidad','disability accessibility'],children:['infancia menores','children child protection'],detention:['detención tortura prisiones','detention torture prisons'],environment:['medio ambiente cambio climático','environment climate change'],food:['seguridad alimentaria hambre','food security hunger'],poverty:['pobreza protección social','poverty social protection'],expression:['libertad de expresión prensa','freedom of expression press'],labour:['derechos laborales trabajadores','labour rights workers'],trafficking:['trata de personas','human trafficking']};
 for(const topic of topics.slice(0,3)){const [es,en]=terms[topic];queryEs.push(`(${tokens(es).join(' OR ')}) España`);queryEn.push(`(${tokens(en).join(' OR ')}) Spain`);}
 return {topics,queries_es:queryEs.length?queryEs:[fallback],queries_en:queryEn,method:'rules_v1'};
}
