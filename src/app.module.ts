import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BuyersModule } from './buyers/buyers.module';
import { CuttingModule } from './cutting/cutting.module';
import { FactoryGuard } from './auth/factory.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { MaterialsModule } from './materials/materials.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchaseOrdersModule } from './pos/pos.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { QcModule } from './qc/qc.module';
import { SewingModule } from './sewing/sewing.module';
import { StylesModule } from './styles/styles.module';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: isProduction
    ? z.string().min(1, 'JWT_SECRET is required')
    : z.string().min(1).default('dev-jwt-secret-change-me'),
  FRONTEND_URL: isProduction
    ? z.string().url('FRONTEND_URL must be a valid URL')
    : z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
    AuthModule,
    BuyersModule,
    CuttingModule,
    InventoryModule,
    MaterialsModule,
    PlansModule,
    PurchaseOrdersModule,
    QcModule,
    SewingModule,
    StylesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FactoryGuard,
    },
  ],
})
export class AppModule {}
