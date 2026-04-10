import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { googleId: data.googleId },
      create: data,
      update: {
        email: data.email,
        name: data.name,
        picture: data.picture,
      },
    });
  }
}
