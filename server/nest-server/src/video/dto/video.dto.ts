import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
