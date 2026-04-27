import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true})
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true, default: "user" })
    role: string;

    @Prop({ default: 'tiny' })
    selectedModel: string;

    @Prop()
    refreshToken?: string;

    @Prop({ default: false })
    isActivate: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);