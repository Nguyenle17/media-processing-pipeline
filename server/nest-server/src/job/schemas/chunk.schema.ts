import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Chunk {
  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true })
  index: number;

  @Prop({
    default: 'waiting',
    enum: ['waiting', 'processing', 'completed', 'failed'],
  })
  status: string;

  @Prop({ default: '' })
  transcript: string;

  @Prop({ default: '' })
  translation: string;

  @Prop({ default: 0 })
  startTime: number;

  @Prop({ default: 0 })
  endTime: number;

  @Prop()
  error: string;
}

export const ChunkSchema = SchemaFactory.createForClass(Chunk);
ChunkSchema.index({ jobId: 1, index: 1 }, { unique: true });