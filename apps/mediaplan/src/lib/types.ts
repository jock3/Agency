export interface MediaPlan {
  id: string;
  campaign_name: string;
  period_start: string;
  period_end: string;
  archived: boolean;
  share_token: string | null;
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
}

export interface FullMediaPlan extends MediaPlan {
  concepts: MediaConcept[];
  categories: Array<MediaCategory & { lines: MediaLine[] }>;
}

export interface PlanSummary extends MediaPlan {
  total_budget: number;
  line_count: number;
  category_count: number;
}
