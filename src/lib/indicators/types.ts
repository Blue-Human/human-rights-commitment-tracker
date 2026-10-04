export type Requirement = 'not_required' | 'recommended' | 'required' | 'pending_review';
export type Scope = Record<string, string>;
export type Indicator = {
  id: string; code: string | null; name: string; description: string | null; indicator_type: string | null;
  topic: string | null; methodology: string | null; orientation: string; preferred_sources: string | null;
  recommended_disaggregation: string | null; updated_at: string;
};
export type Component = {
  id: string; indicator_id: string; code: string; label: string; unit: string;
  value_type: 'numeric' | 'boolean' | 'text' | 'category';
  frequency: 'annual' | 'biennial' | 'quarterly' | 'monthly' | 'irregular';
  visualization: 'line' | 'bar' | 'timeline'; definition: string; formula: string | null; editorial_status: string;
};
export type Observation = {
  id: string; indicator_id: string; component_id: string; country_iso2: string; scope: Scope;
  period_start: string; period_end: string; numeric_value: number | null; boolean_value: boolean | null; text_value: string | null;
  missing_reason: string | null; unit: string; source_url: string; source_title: string; citation: string;
  publication_date: string; retrieved_at: string; series_key: string; methodology_version: string;
  comparability_notes: string | null; break_before: boolean; quality_notes: string | null;
  editorial_status: string; selection_reason: string | null; supersedes_id: string | null; reviewed_at: string | null; updated_at: string;
};
export type IndicatorLink = {
  id: string; indicator_id: string; role: 'primary' | 'supporting' | 'contextual'; rationale: string; rationale_kind: 'specific' | 'general';
  scope: Scope; component_id: string | null; baseline_value_id: string | null; baseline_reason: string | null;
  target_operator: '<=' | '>=' | '=' | 'range' | null; target_type: 'absolute' | 'relative' | null;
  target_value: number | null; target_upper: number | null; target_date: string | null;
  target_source_url: string | null; target_citation: string | null; updated_at: string;
};
export type IndicatorBundle = {
  requirement: Requirement; reason: string | null; links: IndicatorLink[]; indicators: Indicator[];
  components: Component[]; values: Observation[]; latest: Observation[]; baselines: Observation[]; has_older: boolean;
  annex?: {
    origin: string; version: string; requirement: Requirement; reason: string;
    indicators: AnnexIndicator[];
  } | null;
};
export type AnnexIndicator = {
  code: string; name: string; description: string; indicator_type: string;
  role: IndicatorLink['role']; unit: string; frequency: string;
  preferred_sources: string; recommended_disaggregation: string;
};
