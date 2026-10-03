import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'video' },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(
              new InternalServerErrorException('Cloudinary returned no result'),
            );
          }
          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      const response = (await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
        invalidate: true,
      })) as { result: string };

      if (response.result === 'not found') {
        throw new NotFoundException('Video not found on Cloudinary');
      }
      if (response.result !== 'ok') {
        throw new InternalServerErrorException(
          `Cloudinary delete failed: ${response.result}`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(
        `Cloudinary delete failed: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown error';
  }
}
