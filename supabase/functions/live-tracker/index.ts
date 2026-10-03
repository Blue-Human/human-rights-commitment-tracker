import {canonicalUrl,clusterKey,dimensionsFor,publicationDecision,monitoringQueries,relevance,safeEqual,sourceInfo,type Profile,type Discovery} from './core.ts';
import {gdelt} from './providers/gdelt.ts';
import {rss} from './providers/rss.ts';
import {findOriginal} from './providers/original.ts';
import {syncJira} from './jira.ts';

const env=(n:string)=>Deno.env.get(n);
async function rest(path:string,init:RequestInit={}){
 const r=await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`,{...init,signal:AbortSignal.timeout(12000),headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:`Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,'Content-Type':'application/json',...(init.headers||{})}});
 if(!r.ok)throw new Error(`Database request failed (${r.status})`);const t=await r.text();return t?JSON.parse(t):null;
}
export async function handler(req:Request){
 if(req.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405});
 const secret=env('HRCT_MONITORING_SECRET')||env('HRCT_WEBHOOK_SECRET')||'';
 const supplied=req.headers.get('x-hrct-monitoring-secret')||'';
 if(!supplied)return Response.json({error:'unauthorized'},{status:401});
 if(!env('SUPABASE_URL')||!env('SUPABASE_SERVICE_ROLE_KEY'))return Response.json({error:'database_not_configured'},{status:503});
 let authorized=secret?safeEqual(supplied,secret):false;
 if(!authorized&&supplied.startsWith('hrct_'))try{
  authorized=await rest('rpc/hrct_valid_monitoring_token',{method:'POST',body:JSON.stringify({p_token:supplied})});
 }catch{return Response.json({error:'monitoring_not_configured'},{status:503});}
 if(!authorized)return Response.json({error:'unauthorized'},{status:401});
 let body;try{body=await req.json();}catch{return Response.json({error:'invalid_json'},{status:400});}
 const job=body.job||'discover';if(!['discover','process','watch'].includes(job))return Response.json({error:'invalid_job'},{status:400});
 let runId:string|null=null,processed=0,found=0,inserted=0,rejected=0;const errors:{stage:string;message:string}[]=[];
 const start=Date.now();
 try {
 runId=await rest('rpc/hrct_start_monitoring',{method:'POST',body:JSON.stringify({p_job:job})});
 if(!runId)return Response.json({ok:true,skipped:'active_run_or_cooldown'});
 if(job!=='watch'){
 await rest('rpc/hrct_prepare_profiles',{method:'POST',body:'{}'});
 const dimensionRows:{id:string;code:string}[]=await rest('human_security_dimensions?select=id,code');
 const profiles:Profile[]=await rest('monitoring_profiles?select=id,commitment_id,news_query,implementation_query,keywords,queries_es,queries_en,lookback_days,enabled,commitments(title,original_text)&enabled=eq.true&order=last_run_at.asc.nullsfirst&limit=6');
 // Cache shared queries so neighbouring recommendations do not duplicate provider calls.
 const cache=new Map<string,Discovery[]>();const originals=new Map<string,string|null>();let enrichmentBudget=3;let lastGdeltCall=0;
 let feedItems:Discovery[]=[];
 for(const feed of (env('HRCT_RSS_FEEDS')||'').split(',').filter(Boolean))try{feedItems.push(...await rss(feed.trim()));}catch{errors.push({stage:'rss',message:'Configured feed failed'});}
 for(const p of profiles){
 if(Date.now()-start>100000)break;
 let failed=false;
 const dimensionCodes=dimensionsFor(`${p.commitments?.title||''} ${p.commitments?.original_text||''}`);
 const proposed=dimensionRows.filter(d=>dimensionCodes.includes(d.code as any)).map(d=>({commitment_id:p.commitment_id,dimension_id:d.id,classification_method:'rules_v1',reviewed:false,is_primary:false,confidence:null,rationale:'Proposed from matching themes in the recommendation wording; a human reviewer can refine the affected dimensions.'}));
 if(proposed.length)await rest('commitment_human_security?on_conflict=commitment_id,dimension_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(proposed)});
 const generated=monitoringQueries(`${p.commitments?.title||''} ${p.commitments?.original_text||''}`,p.news_query);
 if(!p.queries_es?.length&&!p.queries_en?.length){
  await rest(`monitoring_profiles?id=eq.${p.id}`,{method:'PATCH',body:JSON.stringify({...generated,query_method:generated.method,method:undefined})});
 }
 const contextQueries=p.queries_es?.length||p.queries_en?.length?[...(p.queries_es||[]),...(p.queries_en||[])]:[...generated.queries_es,...generated.queries_en];
 // Rotate languages/topics with each calendar day; bound provider requests per batch.
 const contextQuery=contextQueries[Math.floor(Date.now()/86400000)%contextQueries.length]||p.news_query;
 for(const [query,implementation] of [[contextQuery,false],[p.implementation_query,true]] as const){
 if(!query)continue;
 try{
 const cacheKey=`${query}|${p.lookback_days}`;
 if(!cache.has(cacheKey)){
 const pause=5100-(Date.now()-lastGdeltCall);if(pause>0)await new Promise(r=>setTimeout(r,pause));lastGdeltCall=Date.now();
 cache.set(cacheKey,await gdelt.discover(query,p.lookback_days));}
 const items=[...cache.get(cacheKey)!,...feedItems];
 for(const item of items){
 found++;const url=canonicalUrl(item.url);if(!url){rejected++;continue;}
 const match=relevance(item.title, p.keywords?.length?p.keywords.join(' '):query);
 if(match.score<.5){rejected++;continue;}
 const src=sourceInfo(url);const at=item.publishedAt||item.observedAt||new Date().toISOString();
 const key=await clusterKey(item.title,at);
 if(!originals.has(url)&&enrichmentBudget>0&&src.source_type==='media'&&match.score>=.8){
  enrichmentBudget--;try{originals.set(url,await findOriginal(url));}catch{originals.set(url,null);}
 }
 const originalUrl=originals.get(url)||null;
 // Discovery providers do not supply verified document content. Keep their original title;
 // do not manufacture summaries, excerpts or implementation findings. Original links
 // are exposed only after bounded extraction and verification.
 const result=await rest('rpc/hrct_store_signal',{method:'POST',body:JSON.stringify({p_signal:{url,title:item.title,summary:null,source_domain:new URL(url).hostname,...src,published_at:item.publishedAt||null,observed_at:item.observedAt||null,provider:item.provider,language:item.language||null,event_key:key,original_source_url:originalUrl},p_link:{commitment_id:p.commitment_id,score:match.score,rationale:match.rationale,kind:implementation?'implementation_candidate':'context',publication_status:publicationDecision(item,p,match.score,implementation)?'published':'candidate'},p_dimensions:dimensionsFor(item.title)})});
 if(result?.inserted)inserted++;
 }
 }catch{failed=true;errors.push({stage:'discovery',message:`Provider or persistence failed for profile ${p.id}`});}
 }
 const now=new Date().toISOString();await rest(`monitoring_profiles?id=eq.${p.id}`,{method:'PATCH',body:JSON.stringify({last_run_at:now,...(!failed?{last_success_at:now}:{}),last_error:failed?'Discovery failed; see private run log':null,updated_at:now})});processed++;
 }
 }
 let reviews=0,jira:{configured:boolean;sent:number}={configured:false,sent:0};
 if(job==='watch'){
 reviews=await rest('rpc/hrct_assessment_watch',{method:'POST',body:'{}'});
 try{jira=await syncJira(rest,env);}catch{errors.push({stage:'jira',message:'Jira sync failed; candidates retained for retry'});}
 }
 await rest(`monitoring_runs?id=eq.${runId}`,{method:'PATCH',body:JSON.stringify({finished_at:new Date().toISOString(),profiles_processed:processed,items_found:found,items_inserted:inserted,records_rejected:rejected,status:errors.length?'partial':'success',errors})});
 return Response.json({ok:errors.length===0,processed,found,inserted,rejected,reviews,jira,errors:errors.length},{status:errors.length?207:200});
 }catch{
 if(runId)try{await rest(`monitoring_runs?id=eq.${runId}`,{method:'PATCH',body:JSON.stringify({finished_at:new Date().toISOString(),status:'error',error:'Monitoring job failed',errors})});}catch{}
 return Response.json({error:'monitoring_failed'},{status:500});
 }
}
if(import.meta.main)Deno.serve(handler);
