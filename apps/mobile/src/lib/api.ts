import { getJWT } from './secureStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getJWT();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as object) ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API ${response.status}: ${error}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  // Auth
  googleSignIn: (idToken: string) =>
    request<{ accessToken: string; user: object }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  me: () => request<{ id: string; email: string; name: string }>('/me'),

  // Tasks
  getTasks: () => request<unknown[]>('/tasks'),
  createTask: (data: object) =>
    request<unknown>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: object) =>
    request<unknown>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  // Sessions
  createSession: (data: object) =>
    request<unknown>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  finishSession: (id: string) =>
    request<unknown>(`/sessions/${id}/finish`, { method: 'PATCH' }),
  getStats: () =>
    request<{ todayMinutes: number; weekMinutes: number; currentStreak: number }>(
      '/stats',
    ),
};
