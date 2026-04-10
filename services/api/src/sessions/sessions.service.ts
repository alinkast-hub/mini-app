import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/session.dto';
import { SessionMode } from '@prisma/client';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: { ...dto, userId },
    });
  }

  finish(id: string, userId: string) {
    return this.prisma.session.update({
      where: { id, userId },
      data: { completedAt: new Date() },
    });
  }

  async getStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todaySessions, weekSessions, allSessions] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId, mode: SessionMode.WORK, completedAt: { gte: todayStart } },
      }),
      this.prisma.session.findMany({
        where: { userId, mode: SessionMode.WORK, completedAt: { gte: weekStart } },
      }),
      this.prisma.session.findMany({
        where: { userId, mode: SessionMode.WORK },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const todayMinutes = todaySessions.reduce((s, r) => s + r.durationMinutes, 0);
    const weekMinutes = weekSessions.reduce((s, r) => s + r.durationMinutes, 0);

    // Streak calculation
    const days = new Set(
      allSessions.map((s) => s.completedAt.toISOString().split('T')[0]),
    );
    let streak = 0;
    const check = new Date(now);
    while (days.has(check.toISOString().split('T')[0])) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    return {
      todayMinutes,
      weekMinutes,
      currentStreak: streak,
      totalSessions: allSessions.length,
    };
  }
}
