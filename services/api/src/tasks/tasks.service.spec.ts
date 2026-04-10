import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { Priority } from '@prisma/client';

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const USER_ID = 'user-1';

const baseTask = {
  id: 'task-1',
  userId: USER_ID,
  title: 'Test Task',
  notes: null,
  tags: [],
  priority: Priority.MEDIUM,
  dueDate: null,
  completed: false,
  order: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findAll', () => {
    it('returns tasks ordered by order then createdAt', async () => {
      mockPrisma.task.findMany.mockResolvedValue([baseTask]);

      const result = await service.findAll(USER_ID);

      expect(result).toEqual([baseTask]);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    });

    it('returns empty array when user has no tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await expect(service.findAll(USER_ID)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns a task when found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(baseTask);

      await expect(service.findOne('task-1', USER_ID)).resolves.toEqual(baseTask);
      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: USER_ID },
      });
    });

    it('throws NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a task with the given data', async () => {
      const dto = { title: 'New Task' };
      mockPrisma.task.create.mockResolvedValue({ ...baseTask, ...dto });

      const result = await service.create(USER_ID, dto);

      expect(result).toMatchObject({ title: 'New Task' });
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: { ...dto, userId: USER_ID, dueDate: undefined },
      });
    });

    it('converts dueDate string to Date object', async () => {
      const dto = { title: 'Dated Task', dueDate: '2025-12-31' };
      mockPrisma.task.create.mockResolvedValue(baseTask);

      await service.create(USER_ID, dto);

      const callArg = mockPrisma.task.create.mock.calls[0][0];
      expect(callArg.data.dueDate).toBeInstanceOf(Date);
      expect(callArg.data.dueDate.toISOString().startsWith('2025-12-31')).toBe(true);
    });
  });

  describe('update', () => {
    it('updates a task successfully', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(baseTask);
      const updatedTask = { ...baseTask, title: 'Updated' };
      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.update('task-1', USER_ID, { title: 'Updated' });

      expect(result).toEqual(updatedTask);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { title: 'Updated', dueDate: undefined },
      });
    });

    it('throws NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', USER_ID, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a task successfully', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(baseTask);
      mockPrisma.task.delete.mockResolvedValue(baseTask);

      const result = await service.remove('task-1', USER_ID);

      expect(result).toEqual(baseTask);
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });

    it('throws NotFoundException when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing', USER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });
  });
});
