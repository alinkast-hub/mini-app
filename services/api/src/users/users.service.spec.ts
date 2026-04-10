import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('returns a user when found', async () => {
      const user = { id: '1', email: 'alice@example.com', name: 'Alice' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findById('1')).resolves.toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns a user when found', async () => {
      const user = { id: '1', email: 'alice@example.com', name: 'Alice' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findByEmail('alice@example.com')).resolves.toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail('nobody@example.com')).resolves.toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('returns a user when found', async () => {
      const user = { id: '1', googleId: 'google-sub-123', email: 'alice@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findByGoogleId('google-sub-123')).resolves.toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-sub-123' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByGoogleId('unknown')).resolves.toBeNull();
    });
  });

  describe('upsertGoogleUser', () => {
    it('creates a new user on first sign-in', async () => {
      const data = {
        googleId: 'g-abc',
        email: 'bob@example.com',
        name: 'Bob',
        picture: 'https://example.com/bob.jpg',
      };
      const created = { id: '2', ...data };
      mockPrisma.user.upsert.mockResolvedValue(created);

      await expect(service.upsertGoogleUser(data)).resolves.toEqual(created);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { googleId: data.googleId },
        create: data,
        update: { email: data.email, name: data.name, picture: data.picture },
      });
    });

    it('updates an existing user on subsequent sign-ins', async () => {
      const data = {
        googleId: 'g-abc',
        email: 'bob-new@example.com',
        name: 'Bob Updated',
        picture: undefined,
      };
      const updated = { id: '2', ...data };
      mockPrisma.user.upsert.mockResolvedValue(updated);

      await expect(service.upsertGoogleUser(data)).resolves.toEqual(updated);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { googleId: data.googleId },
        create: data,
        update: { email: data.email, name: data.name, picture: data.picture },
      });
    });
  });
});
