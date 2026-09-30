import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Optional,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('file')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(@Optional() private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const filename = await this.fileService.saveFile(file);
    return { filename };
  }

  @Get(':filename')
  async download(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const filePath = this.fileService.getFilePath(filename);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(createReadStream(filePath));
  }

  @Delete(':filename')
  async remove(@Param('filename') filename: string) {
    await this.fileService.deleteFile(filename);
    return { message: 'File deleted successfully' };
  }
}
