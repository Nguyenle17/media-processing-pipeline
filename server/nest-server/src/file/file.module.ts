import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { MulterModule } from '@nestjs/platform-express';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { diskStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    })
  ],
  providers: [FileService, JwtStrategy],
  exports: [FileService],
})
export class FileModule { }