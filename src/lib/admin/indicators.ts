import 'server-only';
import { adminRest } from './db';
import type { Component, Indicator, IndicatorLink, Observation, Requirement } from '../indicators/types';
export type AdminIndicator = Indicator & { editorial_status:string;active:boolean;import_metadata:Record<string,unknown> };
export type AdminLink = IndicatorLink & {commitment_id:string;editorial_status:string;import_metadata:Record<string,unknown>};
export type Applicability = {indicator_requirement:Requirement;reason:string;editorial_status:string};
export const listIndicators = async (query='') => {
  // No raw PostgREST filter syntax from user input.
  const term=query.replace(/[^\p{L}\p{N}\s-]/gu,'').slice(0,100);
  return adminRest<AdminIndicator[]>(`indicators?select=*&order=code.asc.nullslast&limit=1000${term?`&or=(code.ilike.*${encodeURIComponent(term)}*,name.ilike.*${encodeURIComponent(term)}*,description.ilike.*${encodeURIComponent(term)}*)`:''}`);
};
export async function getIndicator(id:string) { return (await adminRest<AdminIndicator[]>(`indicators?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))[0]||null; }
export const listComponents = (id:string) => adminRest<Component[]>(`indicator_components?indicator_id=eq.${encodeURIComponent(id)}&order=code.asc`);
export const listValues = (id:string) => adminRest<(Observation & {is_current:boolean;authored_by:string})[]>(`indicator_values?indicator_id=eq.${encodeURIComponent(id)}&order=period_start.desc,created_at.desc&limit=1000`);
export const listLinks = (commitmentId:string) => adminRest<AdminLink[]>(`recommendation_indicators?commitment_id=eq.${encodeURIComponent(commitmentId)}&order=created_at.asc`);
export async function getApplicability(commitmentId:string) { return (await adminRest<Applicability[]>(`recommendation_indicator_requirements?commitment_id=eq.${encodeURIComponent(commitmentId)}&limit=1`))[0]||null; }
