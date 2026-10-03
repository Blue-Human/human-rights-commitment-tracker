import type {Signal,Freshness,HumanSecurityDimension} from './hrct';
export const DIMENSIONS = [
 {code:'economic',name:'Economic security'}, {code:'food',name:'Food security'},
 {code:'health',name:'Health security'},{code:'environmental',name:'Environmental security'},
 {code:'personal',name:'Personal security'},{code:'community',name:'Community security'},
 {code:'political',name:'Political security'},
] as const;
export function recent(s:Signal,days=90,now=Date.now()) {
 const at=new Date(s.published_at||s.observed_at||s.discovered_at).getTime();
 return at<=now&&at>=now-days*86400000;
}
export function uniqueEvents(signals:Signal[]):Signal[]{
 const events=new Map<string,Signal>();
 for(const s of signals){const k=s.cluster_id||s.id;const old=events.get(k);if(!old||s.source_tier<old.source_tier)events.set(k,s);}return [...events.values()];
}
export function monitoringState(f?:Freshness,now=Date.now()){
 if(!f||f.enabled===null)return 'Not configured';if(!f.enabled)return 'Paused';if(!f.last_success_at)return 'Awaiting first successful scan';
 if(new Date(f.last_run_at||0).getTime()>new Date(f.last_success_at).getTime())return 'Latest scan incomplete';
 return now-new Date(f.last_success_at).getTime()>86400000?'Monitoring delayed':'Monitoring active';
}
export function dimensionSignals(signals:Signal[],dims:HumanSecurityDimension[],code:string){const ids=new Set(dims.filter(d=>d.code===code).map(d=>d.public_id));return signals.filter(s=>ids.has(s.public_id));}
