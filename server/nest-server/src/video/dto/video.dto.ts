import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TRANSCRIBE_MODES } from '../types/video.type';
import type { TranscribeMode } from '../types/video.type';
import { Type } from 'class-transformer';

export class TranscribeVideoDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsOptional()
  @IsIn(TRANSCRIBE_MODES)
  mode: TranscribeMode = 'normal';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  start?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  end?: number;
}

export class TranslateVideoDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  target_lang?: string;
}

export class GrammarDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class TextToSpeechDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsString()
  @IsNotEmpty()
  language!: string;
}

export class TtsHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 8;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search = '';
}
