type Env=(name:string)=>string|undefined;
export async function syncJira(rest:(path:string,init?:RequestInit)=>Promise<any>,env:Env){
 const base=env('JIRA_BASE_URL'),email=env('JIRA_EMAIL'),token=env('JIRA_API_TOKEN'),project=env('JIRA_PROJECT_KEY');
 if(!base||!email||!token||!project)return {configured:false,sent:0};
 const u=new URL(base);if(u.protocol!=='https:'||!u.hostname.endsWith('.atlassian.net')||u.username||u.password)throw new Error('Invalid Jira host');
 const headers={Authorization:`Basic ${btoa(`${email}:${token}`)}`,'Content-Type':'application/json'};
 // Reflect human completion in Jira back into the private queue, without changing assessments.
 const existing=await rest('monitoring_review_candidates?select=id,jira_issue_key&status=eq.open&jira_issue_key=not.is.null&order=created_at.asc&limit=5');
 for(const row of existing){
  if(!row.jira_issue_key)continue;
  const r=await fetch(new URL(`/rest/api/3/issue/${encodeURIComponent(row.jira_issue_key)}?fields=status`,base),{headers,signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error(`Jira status HTTP ${r.status}`);
  if((await r.json()).fields?.status?.statusCategory?.key==='done')await rest(`monitoring_review_candidates?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({status:'reviewed'})});
 }
 const rows=await rest('monitoring_review_candidates?select=*&status=eq.open&jira_issue_key=is.null&order=created_at.asc&limit=5');let sent=0;
 for(const row of rows){
 // The deterministic label allows retry recovery if Jira succeeded but the DB write failed.
 const label=`hrct-review-${row.id}`;
 const search=await fetch(new URL('/rest/api/3/search/jql',base),{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({jql:`project = "${project.replace(/[^A-Za-z0-9_]/g,'')}" AND labels = "${label}"`,fields:['key'],maxResults:1})});
 if(!search.ok)throw new Error(`Jira lookup HTTP ${search.status}`);
 let key=(await search.json()).issues?.[0]?.key;
 if(!key){const text=`HRCT recommendation ${row.commitment_id}\nTrigger: ${row.trigger}\n${row.rationale}\nSource: ${row.source_url}\nReview the original source and compare with the current assessment. This candidate is not an implementation finding.`;
 const result=await fetch(new URL('/rest/api/3/issue',base),{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({fields:{project:{key:project},issuetype:{name:env('JIRA_REVIEW_ISSUE_TYPE')||'Task'},summary:`HRCT: review new institutional source`,labels:[label,'hrct-assessment-review'],description:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text}]}]}}})});
 if(!result.ok)throw new Error(`Jira create HTTP ${result.status}`);key=(await result.json()).key;}
 await rest(`monitoring_review_candidates?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({jira_issue_key:key})});sent++;
 }return {configured:true,sent};
}
