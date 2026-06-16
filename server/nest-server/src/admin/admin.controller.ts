import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/guard/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Body, Get, Query, Param, Req, Delete, Patch } from '@nestjs/common';



@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('users')
    async getAllUsers(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.adminService.getAllUsers(Number(page), Number(limit));
    }

    @Get('users/search/:query')
    async searchUsers(@Param('query') query: string) {
        return this.adminService.searchUsers(query);
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
    async updateRole(
        @Param('id') id: string,
        @Body('role') role: string,
        @Req() req: any,
    ) {
        console.log('Updating role for user:', id, 'to role:', role, 'by admin:', req.user.userId);
        return this.adminService.updateRole(id, role, req.user.userId);
    }

    @Patch('user/:id/ban')
    async banUser(@Param('id') id: string, @Req() req: any) {
        console.log('Banning user:', id, 'by admin:', req.user.userId);
        return this.adminService.banUser(id, req.user.userId);
    }

    @Patch('user/:id/unban')
    async unbanUser(@Param('id') id: string, @Req() req: any) {
        console.log('Unbanning user:', id, 'by admin:', req.user.userId);
        return this.adminService.unbanUser(id, req.user.userId);
    }
}