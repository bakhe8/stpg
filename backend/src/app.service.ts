import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      services: { database: dbStatus },
    };
  }

  getHello(): string {
    return 'OK';
  }
}
