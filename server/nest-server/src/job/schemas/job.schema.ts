import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Job {
  @Prop()
  userId: string;

  @Prop()
  title: string;

  @Prop({ default: 'transcript' })
  type: 'transcript' | 'translate' | 'summary';

  @Prop({ default: 0 })
  totalChunks: number;

  @Prop({ default: 0 })
  processedChunks: number;

  @Prop({
    default: 'waiting',
    enum: ['waiting', 'processing', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  transcriptText: string;

  @Prop()
  translatedText: string;

  @Prop()
  duration: number; 

  @Prop()
  processingTime: number; 

  @Prop()
  error: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);