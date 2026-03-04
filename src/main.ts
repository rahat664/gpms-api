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
  const isProduction = configService.get('NODE_ENV') === 'production';

  const frontendOrigins = [
    configService.getOrThrow<string>('FRONTEND_URL'),
    'http://localhost:3000',
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: isProduction ? undefined : false,
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GPMS API')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT') ?? 3000);
}

bootstrap();
