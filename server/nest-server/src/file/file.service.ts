import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const MAX_NAME_LENGTH = 100;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

export interface DeleteFileOptions {
  ignoreMissing?: boolean;
}

@Injectable()
export class FileService implements OnModuleInit {
  private readonly logger = new Logger(FileService.name);

  private readonly uploadPath = path.resolve(process.cwd(), 'uploads');

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.uploadPath, { recursive: true });
    this.logger.log(`Uploads directory ready: ${this.uploadPath}`);
  }

  getFilePath(filename: string): string {
    const resolved = path.resolve(this.uploadPath, filename);
    if (!filename || path.dirname(resolved) !== this.uploadPath) {
      throw new BadRequestException('Invalid filename');
    }
    return resolved;
  }

  private sanitizeName(name: string): string {
    const cleaned = path
      .basename(name)
      .replace(/[^\p{L}\p{N}._-]+/gu, '_')
      .replace(/^\.+/, '')
      .slice(-MAX_NAME_LENGTH);
    return cleaned || 'file';
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (file.filename) return file.filename;

    if (!file.buffer) {
      throw new BadRequestException('Invalid file object');
    }

    const unique = `${randomUUID()}-${this.sanitizeName(file.originalname ?? '')}`;
    await fs.writeFile(this.getFilePath(unique), file.buffer);
    return unique;
  }

  async deleteFile(
    filename: string,
    options: DeleteFileOptions = {},
  ): Promise<void> {
    const filePath = this.getFilePath(filename);

    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      if (isErrnoException(error) && error.code === 'ENOENT') {
        if (options.ignoreMissing) return;
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }
}
