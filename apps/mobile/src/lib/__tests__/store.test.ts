/**
 * Tests for the Zustand store — focusing on computeStats which has non-trivial
 * date logic, and the core task/session mutation actions.
 */

// Stub out native modules before any imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/db', () => ({
  getAllTasks: jest.fn(() => Promise.resolve([])),
  getAllSessions: jest.fn(() => Promise.resolve([])),
  createTask: jest.fn(() => Promise.resolve()),
  updateTask: jest.fn(() => Promise.resolve()),
  deleteTask: jest.fn(() => Promise.resolve()),
  createSession: jest.fn(() => Promise.resolve()),
}));

import { useStore } from '../store';
import * as db from '../db';
import { Session, Task } from '@/types';

// Helper to build a minimal work session
function makeSession(completedAt: string, durationMinutes = 25): Session {
  return {
    id: `s-${completedAt}`,
    mode: 'work',
    durationMinutes,
    completedAt,
    synced: false,
  };
}

// Helper to build a minimal task
function makeTask(id: string, title = 'Task', completed = false): Task {
  const now = new Date().toISOString();
  return {
    id,
    title,
    tags: [],
    priority: 'medium',
    completed,
    createdAt: now,
    updatedAt: now,
    order: 0,
    synced: false,
  };
}

// Reset relevant store slices between tests so they don't interfere
beforeEach(() => {
  useStore.setState({
    tasks: [],
    sessions: [],
    stats: { todayMinutes: 0, weekMinutes: 0, currentStreak: 0, totalSessions: 0 },
    timerMode: 'work',
    activeTaskId: null,
    completedSessionsInCycle: 0,
    user: null,
  });
  jest.clearAllMocks();
});

// ── computeStats ──────────────────────────────────────────────────────────────

describe('computeStats', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zero stats when there are no sessions', () => {
    useStore.getState().computeStats();
    const { stats } = useStore.getState();

    expect(stats).toEqual({
      todayMinutes: 0,
      weekMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
    });
  });

  it('counts only work sessions toward totals', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T08:00:00Z', 25),
        { ...makeSession('2024-06-15T09:00:00Z', 5), mode: 'shortBreak' },
      ],
    });

    useStore.getState().computeStats();
    const { stats } = useStore.getState();

    expect(stats.todayMinutes).toBe(25);
    expect(stats.totalSessions).toBe(1);
  });

  it('computes todayMinutes only for sessions completed today', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T08:00:00Z', 25),
        makeSession('2024-06-14T22:00:00Z', 30), // yesterday
      ],
    });

    useStore.getState().computeStats();
    expect(useStore.getState().stats.todayMinutes).toBe(25);
  });

  it('computes weekMinutes for sessions within the last 7 days', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T08:00:00Z', 25),
        makeSession('2024-06-10T08:00:00Z', 30), // 5 days ago — within week
        makeSession('2024-06-07T08:00:00Z', 50), // 8 days ago — outside week
      ],
    });

    useStore.getState().computeStats();
    expect(useStore.getState().stats.weekMinutes).toBe(55);
  });

  it('calculates a streak of consecutive days ending today', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T10:00:00Z'),
        makeSession('2024-06-14T10:00:00Z'),
        makeSession('2024-06-13T10:00:00Z'),
      ],
    });

    useStore.getState().computeStats();
    expect(useStore.getState().stats.currentStreak).toBe(3);
  });

  it('returns streak of 0 when there is no session today', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [makeSession('2024-06-14T10:00:00Z')],
    });

    useStore.getState().computeStats();
    expect(useStore.getState().stats.currentStreak).toBe(0);
  });

  it('breaks the streak when a day is missing', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T10:00:00Z'),
        // 2024-06-14 is missing
        makeSession('2024-06-13T10:00:00Z'),
      ],
    });

    useStore.getState().computeStats();
    expect(useStore.getState().stats.currentStreak).toBe(1);
  });

  it('counts multiple sessions on the same day as one streak day', () => {
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    useStore.setState({
      sessions: [
        makeSession('2024-06-15T09:00:00Z', 25),
        makeSession('2024-06-15T10:00:00Z', 25),
        makeSession('2024-06-14T10:00:00Z', 25),
      ],
    });

    useStore.getState().computeStats();
    const { stats } = useStore.getState();
    expect(stats.currentStreak).toBe(2);
    expect(stats.todayMinutes).toBe(50);
  });
});

// ── Task actions ──────────────────────────────────────────────────────────────

describe('task actions', () => {
  it('addTask adds a task to the store', async () => {
    const task = makeTask('t-1', 'Buy milk');
    await useStore.getState().addTask(task);

    expect(useStore.getState().tasks).toContainEqual(task);
    expect(db.createTask).toHaveBeenCalledWith(task);
  });

  it('editTask updates the task in the store', async () => {
    const task = makeTask('t-1', 'Buy milk');
    useStore.setState({ tasks: [task] });

    const updated = { ...task, title: 'Buy oat milk' };
    await useStore.getState().editTask(updated);

    expect(useStore.getState().tasks[0].title).toBe('Buy oat milk');
    expect(db.updateTask).toHaveBeenCalledWith(updated);
  });

  it('removeTask removes the task from the store', async () => {
    const task = makeTask('t-1', 'Buy milk');
    useStore.setState({ tasks: [task] });

    await useStore.getState().removeTask('t-1');

    expect(useStore.getState().tasks).toHaveLength(0);
    expect(db.deleteTask).toHaveBeenCalledWith('t-1');
  });

  it('reorderTasks assigns new order indices', async () => {
    const t1 = makeTask('t-1', 'First');
    const t2 = makeTask('t-2', 'Second');
    useStore.setState({ tasks: [t1, t2] });

    await useStore.getState().reorderTasks([t2, t1]);

    const { tasks } = useStore.getState();
    expect(tasks[0].id).toBe('t-2');
    expect(tasks[0].order).toBe(0);
    expect(tasks[1].id).toBe('t-1');
    expect(tasks[1].order).toBe(1);
  });
});

// ── Session actions ───────────────────────────────────────────────────────────

describe('session actions', () => {
  it('addSession prepends the session and calls computeStats', async () => {
    const session = makeSession(new Date().toISOString());
    await useStore.getState().addSession(session);

    expect(useStore.getState().sessions[0]).toEqual(session);
    expect(db.createSession).toHaveBeenCalledWith(session);
    // computeStats is triggered — totalSessions should reflect the new session
    expect(useStore.getState().stats.totalSessions).toBe(1);
  });
});

// ── Timer state ───────────────────────────────────────────────────────────────

describe('timer state', () => {
  it('setTimerMode updates the timer mode', () => {
    useStore.getState().setTimerMode('shortBreak');
    expect(useStore.getState().timerMode).toBe('shortBreak');
  });

  it('setActiveTaskId updates the active task', () => {
    useStore.getState().setActiveTaskId('t-42');
    expect(useStore.getState().activeTaskId).toBe('t-42');
  });

  it('incrementCompletedSessions increments the counter', () => {
    useStore.getState().incrementCompletedSessions();
    useStore.getState().incrementCompletedSessions();
    expect(useStore.getState().completedSessionsInCycle).toBe(2);
  });

  it('resetCycle resets the counter to zero', () => {
    useStore.setState({ completedSessionsInCycle: 3 });
    useStore.getState().resetCycle();
    expect(useStore.getState().completedSessionsInCycle).toBe(0);
  });
});
