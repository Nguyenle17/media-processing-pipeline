import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const MEDIA_TYPES = ['video', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export type VideoDocument = HydratedDocument<Video>;

@Schema({ timestamps: true })
export class Video {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ required: true, trim: true })
  originalFilename!: string;

  @Prop({ required: true, enum: MEDIA_TYPES, default: 'video' })
  type!: MediaType;

  @Prop({ required: true, unique: true })
  cloudinaryPublicId!: string;

  @Prop({ required: true })
  cloudinaryUrl!: string;

  @Prop({ required: true, min: 0 })
  duration!: number;

  @Prop({ min: 0 })
  bytes?: number;

  @Prop()
  format?: string;

  @Prop({ type: Types.ObjectId, ref: 'Job' })
  jobId?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
VideoSchema.index({ userId: 1, createdAt: -1 });
