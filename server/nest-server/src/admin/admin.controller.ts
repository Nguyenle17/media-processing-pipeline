import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/guard/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Get, Post } from '@nestjs/common';
import { Body, Param, Req, Delete, Patch } from '@nestjs/common';



@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('users')
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }

    @Get('info/:range')
    async getAllInformation(@Param('range') range: string) {
        return this.adminService.getAllInfomation(range);
    }

    @Delete('user/:id')
    async deleteUser(@Param('id') id: string, @Req() req: any) {
        return this.adminService.deleteUser(id, req.user.userId);
    }

    @Patch('user/:id/role')
    async updateRole(@Param('id') id: string, @Body('role') role: string, @Req() req: any) {
        return this.adminService.updateRole(id, role, req.user.userId);
    }

    @Patch('user/:id/ban')
    async banUser(@Param('id') id: string, @Req() req: any) {
        return this.adminService.banUser(id, req.user.userId);
    }

    @Patch('user/:id/unban')
    async unbanUser(@Param('id') id: string, @Req() req: any) {
        return this.adminService.unbanUser(id, req.user.userId);
    }
}