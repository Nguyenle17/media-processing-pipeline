import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private client: Redis;

    onModuleInit() {
        this.client = new Redis({
            host: 'localhost',
            port: 6379
        })
    };

    getClient() {
        return this.client;
    }

    async set(key: string, value: any) {
        await this.client.set(key, JSON.stringify(value));
    }

    async get(key: string) {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async incr(key: string) {
        return this.client.incr(key);
    }
}
