const {HRCT_MONITORING_URL,HRCT_MONITORING_SECRET,HRCT_JOB='discover'}=process.env;
if(!HRCT_MONITORING_URL||!HRCT_MONITORING_SECRET)throw new Error('Configure HRCT_MONITORING_URL and HRCT_MONITORING_SECRET for the manual fallback. Scheduled jobs use Supabase Vault.');
const r=await fetch(HRCT_MONITORING_URL,{method:'POST',headers:{'Content-Type':'application/json','x-hrct-monitoring-secret':HRCT_MONITORING_SECRET},body:JSON.stringify({job:HRCT_JOB}),signal:AbortSignal.timeout(150000)});
const result=await r.json();console.log(JSON.stringify(result));
if(!r.ok||result.ok!==true)process.exitCode=1;
