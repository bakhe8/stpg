import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api', { exclude: ['/health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Support both ALLOWED_ORIGINS (canonical spec name) and CORS_ORIGINS (legacy)
  const originsEnv = process.env.ALLOWED_ORIGINS ?? process.env.CORS_ORIGINS;
  const allowedOrigins = originsEnv
    ? originsEnv.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3333',
        'http://localhost:3100',
      ];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Entity-ID'],
  };
  app.enableCors(corsOptions);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CollectiveTrustOS API')
    .setDescription('منصة حوكمة الصناديق الاجتماعية — واجهة برمجية كاملة')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
}
void bootstrap();
