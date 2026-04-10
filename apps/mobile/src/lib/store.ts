import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Session, TimerSettings, TimerMode, User, StatsData } from '@/types';
import * as db from '@/lib/db';

const SETTINGS_KEY = 'app_settings';

// ── Default settings ───────────────────────────────────────────────────────
const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

// ── Store types ────────────────────────────────────────────────────────────
interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Settings
  settings: TimerSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<TimerSettings>) => void;

  // Tasks
  tasks: Task[];
  loadTasks: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  editTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  reorderTasks: (tasks: Task[]) => Promise<void>;

  // Sessions
  sessions: Session[];
  loadSessions: () => Promise<void>;
  addSession: (session: Session) => Promise<void>;

  // Timer state
  timerMode: TimerMode;
  setTimerMode: (mode: TimerMode) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  completedSessionsInCycle: number;
  incrementCompletedSessions: () => void;
  resetCycle: () => void;

  // Stats (computed)
  stats: StatsData;
  computeStats: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  // ── Settings ──────────────────────────────────────────────────────────
  settings: DEFAULT_SETTINGS,
  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<TimerSettings>;
        set((state) => ({ settings: { ...state.settings, ...saved } }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },
  updateSettings: (partial) => {
    set((state) => {
      const next = { ...state.settings, ...partial };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch((e) => {
        console.error('Failed to persist settings:', e);
      });
      return { settings: next };
    });
  },

  // ── Tasks ─────────────────────────────────────────────────────────────
  tasks: [],
  loadTasks: async () => {
    const tasks = await db.getAllTasks();
    set({ tasks });
    get().computeStats();
  },
  addTask: async (task) => {
    await db.createTask(task);
    set((state) => ({ tasks: [...state.tasks, task] }));
  },
  editTask: async (task) => {
    await db.updateTask(task);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },
  removeTask: async (id) => {
    await db.deleteTask(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },
  reorderTasks: async (tasks) => {
    const reordered = tasks.map((t, i) => ({ ...t, order: i }));
    for (const task of reordered) {
      await db.updateTask(task);
    }
    set({ tasks: reordered });
  },

  // ── Sessions ──────────────────────────────────────────────────────────
  sessions: [],
  loadSessions: async () => {
    const sessions = await db.getAllSessions();
    set({ sessions });
    get().computeStats();
  },
  addSession: async (session) => {
    await db.createSession(session);
    set((state) => ({ sessions: [session, ...state.sessions] }));
    get().computeStats();
  },

  // ── Timer ─────────────────────────────────────────────────────────────
  timerMode: 'work',
  setTimerMode: (mode) => set({ timerMode: mode }),
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  completedSessionsInCycle: 0,
  incrementCompletedSessions: () =>
    set((state) => ({ completedSessionsInCycle: state.completedSessionsInCycle + 1 })),
  resetCycle: () => set({ completedSessionsInCycle: 0 }),

  // ── Stats ─────────────────────────────────────────────────────────────
  stats: { todayMinutes: 0, weekMinutes: 0, currentStreak: 0, totalSessions: 0 },
  computeStats: () => {
    const { sessions } = get();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const workSessions = sessions.filter((s) => s.mode === 'work');

    const todayMinutes = workSessions
      .filter((s) => s.completedAt.startsWith(todayStr))
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    const weekMinutes = workSessions
      .filter((s) => new Date(s.completedAt) >= weekAgo)
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    // Streak: consecutive days with at least one work session
    const days = new Set(workSessions.map((s) => s.completedAt.split('T')[0]));
    let streak = 0;
    const check = new Date(now);
    while (days.has(check.toISOString().split('T')[0])) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    set({
      stats: {
        todayMinutes,
        weekMinutes,
        currentStreak: streak,
        totalSessions: workSessions.length,
      },
    });
  },
}));
