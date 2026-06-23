export type TodoStatus = "ej_paborjad" | "pagar" | "klar" | "avbruten";

export interface TodoList {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface TodoTask {
  id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  completed: boolean;
  status: TodoStatus;
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface TodoSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}
