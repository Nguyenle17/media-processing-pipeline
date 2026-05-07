import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Job, JobSchema } from '../job/schemas/job.schema';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema }
    ]),
    PassportModule,
    UsersModule
  ],
  providers: [AdminService, UsersService, JwtStrategy],
  controllers: [AdminController],
  exports: [AdminService]
})
export class AdminModule {}
