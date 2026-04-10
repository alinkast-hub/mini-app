import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock the entire google-auth-library so no real OAuth calls are made
jest.mock('google-auth-library');

const mockConfig = {
  get: jest.fn((key: string) => (key === 'GOOGLE_CLIENT_ID' ? 'test-client-id' : 'secret')),
};
const mockJwt = { sign: jest.fn(() => 'signed-token') };
const mockUsers = { upsertGoogleUser: jest.fn(), findById: jest.fn() };

const fakeUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  picture: 'https://example.com/alice.jpg',
  googleId: 'google-sub-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let mockVerifyIdToken: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockVerifyIdToken = jest.fn();
    (OAuth2Client as unknown as jest.Mock).mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: JwtService, useValue: mockJwt },
        { provide: UsersService, useValue: mockUsers },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signJwt', () => {
    it('returns a signed JWT containing sub and email', () => {
      const token = service.signJwt(fakeUser);

      expect(token).toBe('signed-token');
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: fakeUser.id,
        email: fakeUser.email,
      });
    });
  });

  describe('googleSignIn', () => {
    it('returns an accessToken and user on valid ID token', async () => {
      const mockTicket = {
        getPayload: jest.fn(() => ({
          sub: 'google-sub-1',
          email: 'alice@example.com',
          name: 'Alice',
          picture: 'https://example.com/alice.jpg',
        })),
      };
      mockVerifyIdToken.mockResolvedValue(mockTicket);
      mockUsers.upsertGoogleUser.mockResolvedValue(fakeUser);

      const result = await service.googleSignIn('valid-id-token');

      expect(result).toEqual({ accessToken: 'signed-token', user: fakeUser });
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-id-token',
        audience: 'test-client-id',
      });
      expect(mockUsers.upsertGoogleUser).toHaveBeenCalledWith({
        googleId: 'google-sub-1',
        email: 'alice@example.com',
        name: 'Alice',
        picture: 'https://example.com/alice.jpg',
      });
    });

    it('uses email as name when name is absent from token payload', async () => {
      const mockTicket = {
        getPayload: jest.fn(() => ({
          sub: 'google-sub-2',
          email: 'bob@example.com',
          name: undefined,
          picture: undefined,
        })),
      };
      mockVerifyIdToken.mockResolvedValue(mockTicket);
      mockUsers.upsertGoogleUser.mockResolvedValue({ ...fakeUser, name: 'bob@example.com' });

      await service.googleSignIn('valid-id-token');

      expect(mockUsers.upsertGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'bob@example.com' }),
      );
    });

    it('throws UnauthorizedException when Google rejects the token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.googleSignIn('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token payload is missing required fields', async () => {
      const mockTicket = { getPayload: jest.fn(() => null) };
      mockVerifyIdToken.mockResolvedValue(mockTicket);

      await expect(service.googleSignIn('incomplete-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
