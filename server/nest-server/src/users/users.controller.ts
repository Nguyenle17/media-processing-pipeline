import {
  Controller,
  Body,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
  };
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() userData: CreateUserDto) {
    return this.usersService.create(userData);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('settings')
  async updateSettings(
    @Body() body: { model: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const id = req.user.userId;
    return this.usersService.updateSettings(id, body.model);
  }
}
