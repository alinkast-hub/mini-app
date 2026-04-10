import { Controller, Post, Patch, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/session.dto';
import { User } from '@prisma/client';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('sessions')
  create(@Body() dto: CreateSessionDto, @Request() req: { user: User }) {
    return this.sessions.create(req.user.id, dto);
  }

  @Patch('sessions/:id/finish')
  finish(@Param('id') id: string, @Request() req: { user: User }) {
    return this.sessions.finish(id, req.user.id);
  }

  @Get('stats')
  getStats(@Request() req: { user: User }) {
    return this.sessions.getStats(req.user.id);
  }
}
