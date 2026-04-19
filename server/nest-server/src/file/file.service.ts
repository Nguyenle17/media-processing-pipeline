import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileService {
  private uploadPath = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      console.log('Created uploads directory:', this.uploadPath);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!file.filename && !file.originalname) {
      throw new Error('Invalid file object');
    }

    if (file.filename) {
      return file.filename;
    }

    const unique = Date.now() + '-' + file.originalname;
    const filePath = path.join(this.uploadPath, unique);
    fs.writeFileSync(filePath, file.buffer);
    return unique;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadPath, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    fs.unlinkSync(filePath);
  }
}