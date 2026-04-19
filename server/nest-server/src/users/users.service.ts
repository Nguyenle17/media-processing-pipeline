import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) 
        private userModel: Model<UserDocument>,
    ) {}

    async create(userData: CreateUserDto) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        userData.password = hashedPassword;
        const createdUser = new this.userModel(userData);
        return await createdUser.save();
    }

    async findByEmail(email: string) {
        return await this.userModel.findOne({ email}).exec();
    }

    async findById(id: string) {
        return await this.userModel.findById(id).exec();
    }

    async findAll() {
        return await this.userModel.find().exec();
    }

    async updateRefreshToken(id: any, token: string) {
        return await this.userModel.findByIdAndUpdate(
            id,
            { refreshToken: token },
            { new: true },
        ).exec();
    }

    async updateSettings(id: string, model: string) {
        return await this.userModel.findByIdAndUpdate(
            id,
            { selectedModel: model },
            { new: true },
        ).exec();
    }
}
