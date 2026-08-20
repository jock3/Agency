export interface MediaPlan {
  id: string;
  campaign_name: string;
  period_start: string;
  period_end: string;
  archived: boolean;
  share_token: string | null;
  client_id: string | null;
  planned_budget: number | null;
  status: 'draft' | 'active' | 'approved';
  tags: string[];
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

export interface CampaignPlan {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  archived: boolean;
  share_token: string;
  client_id: string | null;
  status: 'draft' | 'active' | 'approved';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  plan_id: string;
  name: string;
  budget: number | null;
  color: string;
  sort_order: number;
}

export type CampaignPlatformStatus = 'inaktiv' | 'schemalagd' | 'aktiv' | 'klar';

export interface CampaignPlatform {
  id: string;
  campaign_id: string;
  platform_name: string;
  start_date: string | null;
  end_date: string | null;
  status: CampaignPlatformStatus;
  budget: number | null;
  color: string;
  sort_order: number;
}

export interface FullCampaignPlan extends CampaignPlan {
  campaigns: Array<Campaign & { platforms: CampaignPlatform[] }>;
}

export type TodoStatus = 'todo' | 'working' | 'stuck' | 'review' | 'done';
export type TodoPriority = 'none' | 'low' | 'medium' | 'high';
export type TodoRepeat = 'daily' | 'weekdays' | 'weekly' | 'monthly';

/** A group on the board. Rows live in todo_lists. */
export interface TodoList {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  collapsed: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface TodoComment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface TodoTask {
  id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  completed: boolean;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  repeat: TodoRepeat | null;
  comments: TodoComment[];
  /** The due date an overdue automation has already reacted to. */
  overdue_key: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
}

export interface AppUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface TodoSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  status: TodoStatus;
  due_date: string | null;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
}

export type AutomationType =
  | 'move_on_status'
  | 'overdue_status'
  | 'date_on_done'
  | 'default_status'
  | 'collapse_done';

export interface Automation {
  id: string;
  type: AutomationType;
  enabled: boolean;
  config: { status?: TodoStatus; listId?: string };
}

export type TodoColumnKey = 'person' | 'status' | 'priority' | 'date' | 'timeline' | 'group';

export interface BoardSettings {
  board_title: string;
  hidden_cols: TodoColumnKey[];
  automations: Automation[];
}

export type CampaignPlanStatus = 'draft' | 'active' | 'approved';

export interface CampaignPlan {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  archived: boolean;
  share_token: string;
  client_id: string | null;
  status: CampaignPlanStatus;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface Campaign {
  id: string;
  plan_id: string;
  name: string;
  budget: number | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface CampaignPlatform {
  id: string;
  campaign_id: string;
  platform_name: string;
  start_date: string | null;
  end_date: string | null;
  status: CampaignPlatformStatus;
  budget: number | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface FullCampaignPlan extends CampaignPlan {
  campaigns: Array<Campaign & { platforms: CampaignPlatform[] }>;
}
