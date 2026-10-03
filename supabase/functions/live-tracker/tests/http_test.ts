import {handler} from '../index.ts';
import {rss} from '../providers/rss.ts';
function equal(actual:unknown,expected:unknown){if(actual!==expected)throw new Error(`${actual} !== ${expected}`);}
Deno.test('HTTP handler rejects GET, anonymous requests, bad secrets and invalid jobs',async()=>{
 Deno.env.set('HRCT_MONITORING_SECRET','test-secret');Deno.env.set('SUPABASE_URL','https://example.supabase.co');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test');
 equal((await handler(new Request('https://example.com'))).status,405);
 equal((await handler(new Request('https://example.com',{method:'POST',body:'{}'}))).status,401);
 equal((await handler(new Request('https://example.com',{method:'POST',headers:{'x-hrct-monitoring-secret':'bad'},body:'{}'}))).status,401);
 equal((await handler(new Request('https://example.com',{method:'POST',headers:{'x-hrct-monitoring-secret':'test-secret'},body:'{"job":"delete"}'}))).status,400);
});
Deno.test('RSS extracts dates, original URL and title without treating XML as executable content',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=()=>Promise.resolve(new Response('<rss><channel><item><title>Racismo en España</title><link>https://www.rtve.es/noticias/a</link><pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>'));
 try{const rows=await rss('https://www.rtve.es/rss/test.xml');equal(rows.length,1);equal(rows[0].publishedAt,'2026-10-02T12:00:00.000Z');equal(rows[0].url,'https://www.rtve.es/noticias/a');}finally{globalThis.fetch=previous;}
});
Deno.test('RSS refuses unapproved hosts and entity declarations',async()=>{
 let failed=false;try{await rss('https://localhost/secret');}catch{failed=true;}equal(failed,true);
 const previous=globalThis.fetch;globalThis.fetch=()=>Promise.resolve(new Response('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>'));
 try{failed=false;try{await rss('https://www.rtve.es/test');}catch{failed=true;}equal(failed,true);}finally{globalThis.fetch=previous;}
});
Deno.test('Original-source promotion refuses unknown domains and verifies the unique institutional reference',async()=>{
 const {findOriginal}=await import('../providers/original.ts');const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=(_url,init)=>{calls++;return Promise.resolve(init?.method==='HEAD'?new Response(null,{status:200}):new Response('<a href="https://www.interior.gob.es/reportes/odio.pdf">Report</a>',{headers:{'Content-Type':'text/html'}}));};
 try{equal(await findOriginal('https://unknown.example/article'),null);equal(calls,0);equal(await findOriginal('https://www.rtve.es/article'),'https://interior.gob.es/reportes/odio.pdf');equal(calls,2);}finally{globalThis.fetch=previous;}
});
Deno.test('Authenticated discovery persists signals without touching evidence or assessments',async()=>{
 const previous=globalThis.fetch;const writes:{url:string;body:any}[]=[];
 const seen=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 globalThis.fetch=(input,init)=>{
 const url=String(input);const body=init?.body?JSON.parse(String(init.body)):null;
 if(init?.method==='POST'||init?.method==='PATCH')writes.push({url,body});
 if(url.includes('hrct_start_monitoring'))return Promise.resolve(Response.json('run-1'));
 if(url.includes('hrct_prepare_profiles'))return Promise.resolve(Response.json(0));
 if(url.includes('human_security_dimensions?'))return Promise.resolve(Response.json([{id:'d1',code:'community'}]));
 if(url.includes('monitoring_profiles?select='))return Promise.resolve(Response.json([{id:'p1',commitment_id:'c1',news_query:'racismo España',implementation_query:null,lookback_days:7,enabled:true,queries_es:['racismo España'],commitments:{title:'Combat racism',original_text:'Combat racism in Spain'}}]));
 if(url.includes('api.gdeltproject.org'))return Promise.resolve(Response.json({articles:[{title:'Racismo en España',url:'https://www.rtve.es/a',seendate:seen}]}));
 if(url.includes('hrct_store_signal'))return Promise.resolve(Response.json({id:'s1',inserted:true}));
 return Promise.resolve(Response.json([]));
 };
 try{const r=await handler(new Request('https://example.com',{method:'POST',headers:{'x-hrct-monitoring-secret':'test-secret'},body:'{"job":"discover"}'}));equal(r.status,200);
 const stored=writes.find(x=>x.url.includes('hrct_store_signal'));equal(stored?.body.p_link.kind,'context');equal(stored?.body.p_link.publication_status,'published');equal(stored?.body.p_signal.published_at,null);
 equal(writes.some(x=>/\/(assessments|evidence)(\?|$)/.test(x.url)),false);
 }finally{globalThis.fetch=previous;}
});
