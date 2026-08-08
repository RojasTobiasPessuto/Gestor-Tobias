import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Subir el limite del body para poder importar backups grandes
  app.use(json({ limit: '25mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? '*',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env['PORT'] ?? 3001);
}
bootstrap();
