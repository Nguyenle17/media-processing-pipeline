import { BullModule } from '@nestjs/bull';

export const BullConfig = BullModule.forRoot({
  redis: {
    host: 'localhost',
    port: 6379,
  },
});
