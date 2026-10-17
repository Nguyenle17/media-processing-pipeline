import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name?: string;

  @Prop({ required: true, unique: true })
  email?: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ required: true, default: 'user' })
  role?: string;

  @Prop({ required: false, default: false })
  isVerified?: boolean;

  @Prop({ type: String, default: null })
  verificationTokenHash?: string | null;

  @Prop({ type: Date, default: null })
  verificationTokenExpiresAt?: Date | null;

  @Prop({ required: false, default: Date.now() })
  createdAt?: Date;

  @Prop({ required: false, default: null })
  codeResetPassword?: string;

  @Prop({ type: Date, required: false, default: null })
  codeResetPasswordExpiredAt?: Date | null;

  @Prop({
    default: 'base',
    enum: ['tiny', 'base', 'small', 'medium', 'large'],
  })
  selectedModel?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ default: true })
  isActivate?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
