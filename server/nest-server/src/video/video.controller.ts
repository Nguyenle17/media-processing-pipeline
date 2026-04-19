import {
    Controller,
    Post,
    Body,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
    constructor(private videoService: VideoService) { }

    @Post('transcribe')
    @UseInterceptors(FileInterceptor('video'))
    async transcribeVideo(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: any,
    ) {
        return this.videoService.transcribeVideo(file, body);
    }

    @Post('grammar')
    async checkGrammar(@Body() body: any) {
        return this.videoService.checkGrammar(body);
    }

    @Post('translate')
    @UseInterceptors(FileInterceptor('video'))
    async translateVideo(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: any,
    ) {
        return this.videoService.translateVideo(file, body);
    }
}