import * as SQLite from 'expo-sqlite';
import { Task, Session } from '@/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('miniapp.db');
  }
  return db;
}

export async function initDB(): Promise<void> {
  const database = await getDB();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT,
      mode TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function getAllTasks(): Promise<Task[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(rowToTask);
}

export async function createTask(task: Task): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO tasks
      (id, title, notes, tags, priority, due_date, completed, created_at, updated_at, sort_order, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    task.id,
    task.title,
    task.notes ?? null,
    JSON.stringify(task.tags),
    task.priority,
    task.dueDate ?? null,
    task.completed ? 1 : 0,
    task.createdAt,
    task.updatedAt,
    task.order,
    task.synced ? 1 : 0,
  );
}

export async function updateTask(task: Task): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE tasks SET
      title = ?, notes = ?, tags = ?, priority = ?, due_date = ?,
      completed = ?, updated_at = ?, sort_order = ?, synced = ?
     WHERE id = ?`,
    task.title,
    task.notes ?? null,
    JSON.stringify(task.tags),
    task.priority,
    task.dueDate ?? null,
    task.completed ? 1 : 0,
    task.updatedAt,
    task.order,
    task.synced ? 1 : 0,
    task.id,
  );
}

export async function deleteTask(id: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(session: Session): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO sessions (id, task_id, mode, duration_minutes, completed_at, synced)
     VALUES (?, ?, ?, ?, ?, ?)`,
    session.id,
    session.taskId ?? null,
    session.mode,
    session.durationMinutes,
    session.completedAt,
    session.synced ? 1 : 0,
  );
}

export async function getAllSessions(): Promise<Session[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sessions ORDER BY completed_at DESC',
  );
  return rows.map(rowToSession);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    notes: (row.notes as string) || undefined,
    tags: JSON.parse((row.tags as string) || '[]'),
    priority: row.priority as Task['priority'],
    dueDate: (row.due_date as string) || undefined,
    completed: row.completed === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    order: row.sort_order as number,
    synced: row.synced === 1,
  };
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    taskId: (row.task_id as string) || undefined,
    mode: row.mode as Session['mode'],
    durationMinutes: row.duration_minutes as number,
    completedAt: row.completed_at as string,
    synced: row.synced === 1,
  };
}
