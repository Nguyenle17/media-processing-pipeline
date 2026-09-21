import { Controller } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('file')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(private fileService: any) {}
}
