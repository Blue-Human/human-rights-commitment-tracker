import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl,clusterKey,dimensionsFor,parseDate,publicationDecision,relevance,reviewReason,safeEqual,sourceInfo,type Profile} from '../supabase/functions/live-tracker/core.ts';
import {monitoringState,uniqueEvents,recent} from '../src/lib/live.ts';
import {syncJira} from '../supabase/functions/live-tracker/jira.ts';
const p:Profile={id:'1',commitment_id:'2',enabled:true,news_query:'racismo España',lookback_days:7};
const d={title:'El racismo en España',url:'https://www.rtve.es/noticias/123',publishedAt:'2026-10-03T00:00:00Z',provider:'rss'};
const now=Date.parse('2026-10-03T12:00:00Z');
test('URL normalization prevents tracking and fragment duplicates',()=>assert.equal(canonicalUrl('https://www.rtve.es/news?a=1&utm_source=x#top'),'https://rtve.es/news?a=1'));
test('Unsafe source URLs are rejected',()=>{for(const s of ['javascript:alert(1)','http://localhost/a','http://127.0.0.1/a','https://user:password@rtve.es/a','http://[::1]/a'])assert.equal(canonicalUrl(s),null);});
test('Unrelated titles receive zero score; no fabricated baseline',()=>assert.equal(relevance('Football scores','racismo España').score,0));
test('Spanish and English concepts match',()=>assert.equal(relevance('Racism in Spain','racismo España').score,1));
test('Human security supports several dimensions',()=>{const ds=dimensionsFor('Racist violence against migrants');assert.ok(ds.includes('community'));assert.ok(ds.includes('personal'));});
test('Official source classification requires exact domains',()=>{assert.equal(sourceInfo('https://interior.gob.es/a').source_type,'official');assert.equal(sourceInfo('https://interior.gob.es.evil.com/a').source_type,'media');assert.equal(sourceInfo('https://defensordelpueblo.es/a').source_tier,2);});
test('Signals and implementation candidates have separate publication rules',()=>{assert.equal(publicationDecision(d,p,1,false,now),true);assert.equal(publicationDecision(d,p,1,true,now),false);});
test('Disabled, low relevance, stale, future or unknown-source items cannot publish',()=>{
 assert.equal(publicationDecision(d,{...p,enabled:false},1,false,now),false);assert.equal(publicationDecision(d,p,.5,false,now),false);
 for(const date of ['2020-01-01','2027-01-01',null])assert.equal(publicationDecision({...d,publishedAt:date},p,1,false,now),false);
 assert.equal(publicationDecision({...d,url:'https://unknown.example/a'},p,1,false,now),false);
});
test('GDELT observation date is not an invented publication date',()=>assert.equal(parseDate('20261003T112233Z'),'2026-10-03T11:22:33.000Z'));
test('Only precise headlines in the same day cluster automatically',async()=>{assert.equal(await clusterKey('Racismo en España','2026-10-03'),await clusterKey('RACISMO EN ESPAÑA!','2026-10-03'));assert.notEqual(await clusterKey('Racismo en España','2026-10-03'),await clusterKey('Racismo en España','2026-10-04'));});
test('Routine media/context signals do not create assessment review triggers',()=>{assert.equal(reviewReason('official',.9,false),null);assert.equal(reviewReason('media',1,true),null);assert.equal(reviewReason('official',.9,true),'major_new_official_source');});
test('Secret matching fails closed',()=>{assert.equal(safeEqual('',''),false);assert.equal(safeEqual('abc','abc'),true);assert.equal(safeEqual('abc','abd'),false);});
test('Freshness describes real success and failures, never claims live from configuration alone',()=>{
 const f={public_id:'1',enabled:true,last_run_at:null,last_success_at:null,last_signal_at:null,last_evidence_at:null};
 assert.equal(monitoringState(f,now),'Awaiting first successful scan');
 assert.equal(monitoringState({...f,last_run_at:'2026-10-03T11:00:00Z',last_success_at:'2026-10-03T10:00:00Z'},now),'Latest scan incomplete');
});
test('Event feed removes repeated recommendation links and prefers institutional sources',()=>{
 const a={...d,id:'1',cluster_id:'a',source_tier:4,discovered_at:d.publishedAt,public_id:'1'} as any;
 const b={...a,id:'2',source_tier:1,public_id:'2'};assert.equal(uniqueEvents([a,b]).length,1);assert.equal(uniqueEvents([a,b])[0].id,'2');assert.equal(recent(a,90,now),true);
});
test('Jira integration skips requests when credentials are absent',async()=>{let calls=0;const result=await syncJira(async()=>{calls++;},()=>undefined);assert.equal(calls,0);assert.equal(result.configured,false);});
test('Jira uses idempotent label to recover an existing exception without creating a duplicate',async()=>{
 const original=globalThis.fetch;let requests=0;let updated:any;
 globalThis.fetch=async()=>{requests++;return Response.json({issues:[{key:'HRCT-99'}]});};
 try{const result=await syncJira(async(path,init)=>{if(!init)return [{id:'abc',commitment_id:'c',source_url:d.url,trigger:'major_new_official_source',rationale:'Review'}];updated=JSON.parse(String(init.body));},name=>({JIRA_BASE_URL:'https://bluehuman.atlassian.net',JIRA_EMAIL:'test@example.org',JIRA_API_TOKEN:'test',JIRA_PROJECT_KEY:'HRCT'} as Record<string,string>)[name]);
 assert.equal(requests,1);assert.equal(result.sent,1);assert.equal(updated.jira_issue_key,'HRCT-99');}finally{globalThis.fetch=original;}
});

test('Monitoring queries expand recommendation themes into Spanish and English',async()=>{
 const {monitoringQueries}=await import('../supabase/functions/live-tracker/core.ts');
 const q=monitoringQueries('Combat racism and racial discrimination','legacy query');
 assert.ok(q.queries_es.some(s=>s.includes('racismo')));assert.ok(q.queries_en.some(s=>s.includes('racism')));
 assert.ok(q.topics.includes('racism'));
});
test('Jira completion resolves the private review candidate without changing assessments',async()=>{
 const original=globalThis.fetch;const updates:{path:string;body:any}[]=[];
 globalThis.fetch=async()=>Response.json({fields:{status:{statusCategory:{key:'done'}}}});
 try{await syncJira(async(path,init)=>{if(init){updates.push({path,body:JSON.parse(String(init.body))});return null;}return path.includes('not.is.null')?[{id:'abc',jira_issue_key:'HRCT-99'}]:[];},name=>({JIRA_BASE_URL:'https://bluehuman.atlassian.net',JIRA_EMAIL:'test@example.org',JIRA_API_TOKEN:'test',JIRA_PROJECT_KEY:'HRCT'} as Record<string,string>)[name]);
 assert.deepEqual(updates,[{path:'monitoring_review_candidates?id=eq.abc',body:{status:'reviewed'}}]);}finally{globalThis.fetch=original;}
});
