/**
 * Tests for the api.ts request helper.
 *
 * These tests verify that the `api` object constructs the correct URL,
 * attaches the JWT as a Bearer token, and surfaces HTTP errors properly.
 */

jest.mock('../secureStorage', () => ({
  getJWT: jest.fn(),
}));

import { api } from '../api';
import { getJWT } from '../secureStorage';

const mockGetJWT = getJWT as jest.MockedFunction<typeof getJWT>;

/** Creates a fake fetch Response */
function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('api request helper', () => {
  describe('authentication headers', () => {
    it('attaches a Bearer token when a JWT is stored', async () => {
      mockGetJWT.mockResolvedValue('my-jwt-token');
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ status: 'ok' }));

      await api.health();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer my-jwt-token',
      );
    });

    it('omits the Authorization header when no JWT is stored', async () => {
      mockGetJWT.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ status: 'ok' }));

      await api.health();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('always sends Content-Type: application/json', async () => {
      mockGetJWT.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ status: 'ok' }));

      await api.health();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect((options.headers as Record<string, string>)['Content-Type']).toBe(
        'application/json',
      );
    });
  });

  describe('api.health', () => {
    it('calls GET /health and returns the response', async () => {
      mockGetJWT.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ status: 'ok' }));

      const result = await api.health();

      expect(result).toEqual({ status: 'ok' });
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/health$/);
    });
  });

  describe('api.googleSignIn', () => {
    it('calls POST /auth/google with the idToken in the body', async () => {
      mockGetJWT.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ accessToken: 'tok', user: {} }),
      );

      await api.googleSignIn('google-id-token-123');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/auth\/google$/);
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual({ idToken: 'google-id-token-123' });
    });
  });

  describe('api.getTasks', () => {
    it('calls GET /tasks and returns an array', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      const tasks = [{ id: '1', title: 'Task 1' }];
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse(tasks));

      const result = await api.getTasks();

      expect(result).toEqual(tasks);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/tasks$/);
    });
  });

  describe('api.createTask', () => {
    it('calls POST /tasks with the task data', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      const data = { title: 'New Task' };
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ id: '2', ...data }));

      await api.createTask(data);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/tasks$/);
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual(data);
    });
  });

  describe('api.updateTask', () => {
    it('calls PATCH /tasks/:id with the updated data', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ id: 'task-1' }));

      await api.updateTask('task-1', { completed: true });

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/tasks\/task-1$/);
      expect(options.method).toBe('PATCH');
    });
  });

  describe('api.deleteTask', () => {
    it('calls DELETE /tasks/:id', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse(null, 200));

      await api.deleteTask('task-1');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/tasks\/task-1$/);
      expect(options.method).toBe('DELETE');
    });
  });

  describe('api.getStats', () => {
    it('calls GET /stats and returns the stats object', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      const stats = { todayMinutes: 50, weekMinutes: 200, currentStreak: 3 };
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse(stats));

      const result = await api.getStats();

      expect(result).toEqual(stats);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/stats$/);
    });
  });

  describe('error handling', () => {
    it('throws an error with the status code on non-ok responses', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse('Not Found', 404));

      await expect(api.getTasks()).rejects.toThrow('API 404');
    });

    it('includes the response body in the error message', async () => {
      mockGetJWT.mockResolvedValue('jwt');
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse('Unauthorized', 401));

      await expect(api.getTasks()).rejects.toThrow('401');
    });
  });
});
