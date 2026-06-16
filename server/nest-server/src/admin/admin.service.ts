import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Job } from '../job/schemas/job.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AdminService {
    constructor(
        private usersService: UsersService,

        @InjectModel(User.name)
        private userModel: Model<UserDocument>,

        @InjectModel(Job.name)
        private jobModel: Model<Job>,
    ) { }

    private getDateFilter(range: string) {
        const map = {
            '1d': 1,
            '7d': 7,
            '30d': 30,
        };
        console.log('Range:', range, 'Map Value:', map[range]);
        if (range === 'all' || !map[range]) return {};

        return {
            createdAt: {
                $gte: new Date(Date.now() - map[range] * 24 * 60 * 60 * 1000),
            },
        };
    }

    async getAllInfomation(range = 'all') {
        const dateFilter = this.getDateFilter(range);

        const userFilter = (extra = {}) => ({
            ...extra,
            ...dateFilter,
        });

        const jobFilter = (extra = {}) => ({
            ...extra,
            ...dateFilter,
        });

        const [
            totalUsers,
            activeUsers,
            bannedUsers,
            adminUsers,
            totalJobs,
            totalJobsSuccess,
            totalJobsFailed,
            totalJobsProcessing,
            totalTime,
        ] = await Promise.all([
            this.userModel.countDocuments(userFilter()),
            this.userModel.countDocuments(userFilter({ isActivate: true })),
            this.userModel.countDocuments(userFilter({ isActivate: false })),
            this.userModel.countDocuments(userFilter({ role: 'admin' })),

            this.jobModel.countDocuments(jobFilter()),
            this.jobModel.countDocuments(jobFilter({ status: 'completed' })),
            this.jobModel.countDocuments(jobFilter({ status: 'failed' })),
            this.jobModel.countDocuments(jobFilter({ status: 'processing' })),

            this.jobModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalDuration: { $sum: '$duration' },
                    },
                },
            ]),
        ]);

        return {
            totalUsers,
            activeUsers,
            bannedUsers,
            adminUsers,
            totalJobs,
            totalJobsSuccess,
            totalJobsFailed,
            totalJobsProcessing,
            totalTime: totalTime[0]?.totalDuration || 0,
        };
    }

    async getAllUsers(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.userModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            this.userModel.countDocuments(),
        ]);
        return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async deleteUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot delete yourself');
        }

        const user = await this.usersService.findById(id);
        if (!user) throw new Error('User not found');

        return this.userModel.findByIdAndDelete(id);
    }

    async updateRole(id: string, role: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot change your own role');
        }

        if (!['admin', 'user'].includes(role)) {
            throw new Error('Invalid role');
        }

        return this.usersService.updateRole(id, role);
    }

    async banUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot ban yourself');
        }

        const user = await this.userModel.findById(id);
        if (!user) throw new Error('User not found');

        return this.usersService.updateStatus(id, false);
    }

    async unbanUser(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new Error('Cannot unban yourself');
        }

        const user = await this.userModel.findById(id);
        if (!user) throw new Error('User not found');

        return this.usersService.updateStatus(id, true);
    }

    async searchUsers(query: string) {
        return this.userModel.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        });
    }
}