import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { MulterModule } from '@nestjs/platform-express';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { FileController } from './file.controller';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  providers: [FileService, JwtStrategy],
  controllers: [FileController],
  exports: [FileService],
})
export class FileModule {}
