export interface Task {
  id: string;
  title: string;
  description?: string;
  day: string; // 'monday', 'tuesday', etc.
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeekDay {
  name: string;
  value: string;
  date: Date;
}

export interface DragResult {
  active: {
    id: string;
  };
  over: {
    id: string;
  } | null;
} 