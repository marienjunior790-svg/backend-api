import { PrismaClient } from '@prisma/client';
import { singleton } from 'tsyringe';

@singleton()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async connect(): Promise<void> {
    await this.$connect();
  }

  async disconnect(): Promise<void> {
    await this.$disconnect();
  }
}
