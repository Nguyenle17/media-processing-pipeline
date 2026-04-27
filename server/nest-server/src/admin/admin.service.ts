import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AdminService {
    constructor(
        private usersService: UsersService,
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ) {}

    async getAllUsers() {
        return this.usersService.findAll();
    }

    async deleteUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot delete yourself');
        }

        const user = await this.usersService.findById(id);
        if (!user) {
            throw new Error('User not found');
        }

        return this.userModel.findByIdAndDelete(id);
    }

    async updateRole(id: string, role: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot change your own role');
        }

        const validRoles = ['admin', 'user'];

        if (!validRoles.includes(role)) {
            throw new Error('Invalid role');
        }

        return this.usersService.updateRole(id, role);
    }

    async banUser(id: string, currentUserId: string) {
        if (id == currentUserId) {
            throw new Error("Cannot ban your account")
        }

        const user = await this.userModel.findById(id);
        if(!user) {
            throw new Error("User not found")
        }

        return this.usersService.updateStatus(id, false);
    }

    async unbanUser(id: string, currentUserId: string) {
        if (id == currentUserId) {
            throw new Error("Cannot unban your account")
        }

        const user = await this.userModel.findById(id);
        if(!user) {
            throw new Error("User not found")
        }

        return this.usersService.updateStatus(id, true);
    }
}