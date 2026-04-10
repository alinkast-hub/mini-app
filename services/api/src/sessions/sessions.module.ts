import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [PrismaModule],
  providers: [SessionsService],
  controllers: [SessionsController],
})
export class SessionsModule {}
