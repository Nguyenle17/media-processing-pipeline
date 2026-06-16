import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  userId: string;

  @Prop({ default: 'Untitled Job' })
  title: string;

  @Prop({ default: 'transcript', enum: ['transcript', 'translate'] })
  type: string;

  @Prop({ default: 0 })
  totalChunks: number;

  @Prop({ default: 0 })
  processedChunks: number;

  @Prop({
    default: 'waiting',
    enum: ['waiting', 'processing', 'translating', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  transcriptText: string;

  @Prop()
  translatedText: string;

  @Prop({ default: 0 })
  duration: number;

  @Prop()
  targetLang: string;

  @Prop()
  error: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);