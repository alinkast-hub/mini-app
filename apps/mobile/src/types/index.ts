export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  tags: string[];
  priority: Priority;
  dueDate?: string; // ISO string
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  order: number;
  synced: boolean;
}

export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface TimerSettings {
  workDuration: number;    // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
}

export interface Session {
  id: string;
  taskId?: string;
  mode: TimerMode;
  durationMinutes: number;
  completedAt: string;
  synced: boolean;
}

export interface StatsData {
  todayMinutes: number;
  weekMinutes: number;
  currentStreak: number;
  totalSessions: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}
