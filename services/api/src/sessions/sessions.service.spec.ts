import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionMode } from '@prisma/client';

const mockPrisma = {
  session: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const USER_ID = 'user-1';

/** Build a completed work session with the given completedAt date string. */
function workSession(completedAt: string, durationMinutes = 25) {
  return {
    id: `s-${completedAt}`,
    userId: USER_ID,
    mode: SessionMode.WORK,
    durationMinutes,
    completedAt: new Date(completedAt),
    taskId: null,
  };
}

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('create', () => {
    it('creates a session for the user', async () => {
      const dto = { mode: SessionMode.WORK, durationMinutes: 25 };
      const created = { id: 's-1', userId: USER_ID, ...dto };
      mockPrisma.session.create.mockResolvedValue(created);

      await expect(service.create(USER_ID, dto)).resolves.toEqual(created);
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: { ...dto, userId: USER_ID },
      });
    });
  });

  describe('finish', () => {
    it('sets completedAt on the session', async () => {
      const session = { id: 's-1', userId: USER_ID, completedAt: new Date() };
      mockPrisma.session.update.mockResolvedValue(session);

      await service.finish('s-1', USER_ID);

      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's-1', userId: USER_ID },
          data: expect.objectContaining({ completedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates todayMinutes correctly', async () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const todaySession = workSession('2024-06-15T08:00:00Z', 25);
      const yesterdaySession = workSession('2024-06-14T08:00:00Z', 50);

      // today → all, week → both, all → both
      mockPrisma.session.findMany
        .mockResolvedValueOnce([todaySession])
        .mockResolvedValueOnce([todaySession, yesterdaySession])
        .mockResolvedValueOnce([todaySession, yesterdaySession]);

      const stats = await service.getStats(USER_ID);

      expect(stats.todayMinutes).toBe(25);
      expect(stats.weekMinutes).toBe(75);
      expect(stats.totalSessions).toBe(2);
    });

    it('returns zero streak when no sessions today', async () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      // No sessions today
      mockPrisma.session.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([workSession('2024-06-14T08:00:00Z')]);

      const stats = await service.getStats(USER_ID);

      expect(stats.currentStreak).toBe(0);
    });

    it('counts a streak of consecutive days ending today', async () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const sessions = [
        workSession('2024-06-15T10:00:00Z'),
        workSession('2024-06-14T10:00:00Z'),
        workSession('2024-06-13T10:00:00Z'),
      ];

      mockPrisma.session.findMany
        .mockResolvedValueOnce(sessions.slice(0, 1))
        .mockResolvedValueOnce(sessions)
        .mockResolvedValueOnce(sessions);

      const stats = await service.getStats(USER_ID);

      expect(stats.currentStreak).toBe(3);
    });

    it('breaks the streak when a day is missing', async () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      // Day 2024-06-14 is missing — streak breaks after today
      const sessions = [
        workSession('2024-06-15T10:00:00Z'),
        workSession('2024-06-13T10:00:00Z'),
      ];

      mockPrisma.session.findMany
        .mockResolvedValueOnce(sessions.slice(0, 1))
        .mockResolvedValueOnce(sessions)
        .mockResolvedValueOnce(sessions);

      const stats = await service.getStats(USER_ID);

      expect(stats.currentStreak).toBe(1);
    });

    it('returns zero stats when there are no sessions', async () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      mockPrisma.session.findMany.mockResolvedValue([]);

      const stats = await service.getStats(USER_ID);

      expect(stats).toEqual({
        todayMinutes: 0,
        weekMinutes: 0,
        currentStreak: 0,
        totalSessions: 0,
      });
    });
  });
});
