import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  const allowedOrigins = new Set([
    frontendUrl,
    'https://gpms-web664.vercel.app',
    'http://localhost:3000',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients like curl/postman (no Origin header)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-factory-id'],
    optionsSuccessStatus: 204,
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: isProduction ? undefined : false,
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GPMS API')
    .setDescription('Garment Production Management System API')
    .setVersion('1.0.0')
    .addCookieAuth('gpms_access')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT') ?? 3000);
}

bootstrap();
