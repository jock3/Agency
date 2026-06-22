export interface MediaPlan {
  id: string;
  campaign_name: string;
  period_start: string;
  period_end: string;
  archived: boolean;
  share_token: string | null;
  planned_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface MediaConcept {
  id: string;
  plan_id: string;
  name: string;
  start_date: string;
  end_date: string;
  color: string;
  sort_order: number;
}

export interface MediaCategory {
  id: string;
  plan_id: string;
  name: string;
  budget: number | null;
  color: string;
  sort_order: number;
}

export interface MediaLine {
  id: string;
  category_id: string;
  platform_name: string;
  cost_per_unit: number | null;
  unit_type: string;
  quantity: number;
  campaign_mapping: string | null;
  color: string;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  deadline_date: string | null;
  deadline_label: string | null;
  estimated_reach: number | null;
}

export interface MediaDeadline {
  id: string;
  plan_id: string;
  name: string;
  date: string;
  color: string;
}

export interface FullMediaPlan extends MediaPlan {
  concepts: MediaConcept[];
  categories: Array<MediaCategory & { lines: MediaLine[] }>;
  deadlines: MediaDeadline[];
}

export interface PlanSummary extends MediaPlan {
  total_budget: number;
  line_count: number;
  category_count: number;
}
