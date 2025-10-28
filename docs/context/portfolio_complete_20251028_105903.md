# Portfolio Dashboard - Complete Export
**Generated:** 2025-10-28 10:59:03 IST
---
## Backend Source

### `apps\backend\src\app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './common/guards/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}

```

### `apps\backend\src\auth\auth.controller.ts`
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/common';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}

```

### `apps\backend\src\auth\auth.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION') || '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

```

### `apps\backend\src\auth\auth.service.ts`
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (exists) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.generateToken(user.id, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user.id, user.username);
  }

  private generateToken(userId: string, username: string) {
    const payload = { sub: userId, username };
    return {
      accessToken: this.jwt.sign(payload),
    };
  }
}

```

### `apps\backend\src\auth\dto\login.dto.ts`
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

```

### `apps\backend\src\auth\dto\register.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;
}

```

### `apps\backend\src\auth\strategies\jwt.strategy.ts`
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

```

### `apps\backend\src\common\decorators\common\index.ts`
```typescript
export * from './public.decorator';
export * from './paginate.decorator';

```

### `apps\backend\src\common\decorators\common\paginate.decorator.ts`
```typescript
import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const PAGINATE_METADATA_KEY = 'paginate';

export interface PaginateOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: { [key: string]: any };
}


export const Paginate = (
  options: PaginateOptions = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    order: 'desc',
  },
) => SetMetadata(PAGINATE_METADATA_KEY, options);


export const PaginationParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginateOptions => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page, 10) || 1;
    const limit = parseInt(request.query.limit, 10) || 20;
    const sortBy = request.query.sortBy || 'createdAt';
    const order = request.query.order || 'desc';
    const search = request.query.search || '';
    const filters = request.query.filters
      ? JSON.parse(request.query.filters)
      : {};
    return { page, limit, sortBy, order, search, filters };
  },
);

```

### `apps\backend\src\common\decorators\common\public.decorator.ts`
```typescript

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

```

### `apps\backend\src\common\decorators\user\get-current-user.decorator.ts`
```typescript

import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    if (data) {
      return request.user[data];
    }
    return request.user;
  },
);

```

### `apps\backend\src\common\decorators\user\get-current-user-id.decorator.ts`
```typescript

import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    return request.user?.userId;
  },
);

```

### `apps\backend\src\common\decorators\user\index.ts`
```typescript
export * from './get-current-user.decorator';
export * from './get-current-user-id.decorator';

```

### `apps\backend\src\common\dto\pagination.dto.ts`
```typescript

import { IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  filters?: { [key: string]: any };
}

```

### `apps\backend\src\common\filters\exception.filters.ts`
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      this.logger.error('Headers already sent. Cannot send error response.');
      this.logger.error('Exception details:', exception);
      return;
    }

    let status: number;
    let message: string;
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors || [];
      } else {
        message = exceptionResponse;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error('Unhandled exception:', exception);
    }

    try {
      response.status(status).json({
        statusCode: status,
        message,
        errors,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } catch (error) {
      this.logger.error('Failed to send error response:', error);
    }
  }
}

```

### `apps\backend\src\common\filters\ws-exception.filter.ts`
```typescript
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const error =
      exception instanceof WsException
        ? exception.getError()
        : exception instanceof Error
          ? exception.message
          : 'Unknown error';

    client.emit('error', {
      message: typeof error === 'string' ? error : 'Internal server error',
      code: 'WS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

```

### `apps\backend\src\common\guards\auth\access-token.guard.ts`
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../decorators/common';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}

```

### `apps\backend\src\common\guards\auth\index.ts`
```typescript
export * from './access-token.guard';
export * from './refresh-token.guard';

```

### `apps\backend\src\common\guards\auth\refresh-token.guard.ts`
```typescript
// src/auth/guards/refresh-token.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}

```

### `apps\backend\src\common\interceptors\response.interceptor.ts`
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PAGINATE_METADATA_KEY, PaginateOptions } from '../decorators/common';
import { Response } from 'express';

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | null;
  errors?: string[];
  timestamp: string;
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

interface PaginationResult {
  data: any;
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    if (response.headersSent) {
      return next.handle();
    }

    const contentType = response.getHeader('Content-Type');
    if (contentType && contentType.toString().includes('text/event-stream')) {
      return next.handle();
    }

    const paginateOptions = this.reflector.get<PaginateOptions>(
      PAGINATE_METADATA_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: any) => {
        if (response.headersSent) {
          return data;
        }

        const updatedContentType = response.getHeader('Content-Type');
        if (updatedContentType && updatedContentType.toString().includes('text/event-stream')) {
          return data;
        }

        if (!data || response.statusCode === 302 || response.statusCode === 301) {
          return data;
        }

        const statusCode = data.statusCode || response.statusCode || HttpStatus.OK;
        const message = data.message || response.locals.customMessage || 'Success';
        const errors = data.errors || response.locals.errors || [];
        const timestamp = data.timestamp || new Date().toISOString();

        if (data && typeof data === 'object' && data.pagination) {
          return this.sanitizeResponse({
            statusCode,
            message,
            data: data.data,
            errors,
            timestamp,
            pagination: data.pagination,
          });
        }

        const responseData = data.data !== undefined ? data.data : data;
        const paginationData: PaginationResult = {
          data: responseData,
        };

        if (Array.isArray(responseData) && paginateOptions) {
          const paginated = this.applyPagination(responseData, paginateOptions, request);
          paginationData.data = paginated.data;
          paginationData.pagination = paginated.pagination;
        }

        return this.sanitizeResponse({
          statusCode,
          message,
          data: paginationData.data as T,
          errors,
          timestamp,
          ...(paginationData.pagination ? { pagination: paginationData.pagination } : {}),
        });
      }),
    );
  }

  private applyPagination(data: any[], options: PaginateOptions, request: any): PaginationResult {
    let { page, limit, sortBy, order, search, filters } = options;
    page = parseInt(request.query.page, 10) || page || 1;
    limit = parseInt(request.query.limit, 10) || limit || 20;
    sortBy = request.query.sortBy || sortBy || 'createdAt';
    order = request.query.order || order || 'desc';
    search = request.query.search || search || '';
    filters = request.query.filters ? JSON.parse(request.query.filters) : filters || {};

    let filteredData = data;

    if (search) {
      filteredData = filteredData.filter((item) =>
        Object.values(item).some((val) => String(val).toLowerCase().includes(search.toLowerCase())),
      );
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        filteredData = filteredData.filter((item: { [key: string]: any }) => item[key] === value);
      }
    }

    if (sortBy) {
      filteredData = filteredData.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) {
          return order === 'asc' ? -1 : 1;
        }
        if (a[sortBy] > b[sortBy]) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: paginatedData.length,
      },
    };
  }

  private sanitizeData(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    } else if (data !== null && typeof data === 'object') {
      if (typeof data.toISOString === 'function') {
        return data.toISOString();
      }
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === 'hash' || key === 'password') {
          continue;
        }
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  }

  private sanitizeResponse(response: ApiResponse<T>): ApiResponse<T> {
    return this.sanitizeData(response);
  }
}

```

### `apps\backend\src\main.ts`
```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/exception.filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portfolio Dashboard API')
    .setDescription('Real-time stock portfolio tracking API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.BACKEND_PORT || 3001;
  await app.listen(port);

  console.log(`API running at http://localhost:${port}/api`);
  console.log(`Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();

```

### `apps\backend\src\prisma\prisma.module.ts`
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

```

### `apps\backend\src\prisma\prisma.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

```

---
## Frontend - App Router

### `apps\frontend\app\globals.css`
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

```

### `apps\frontend\app\layout.tsx`
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

```

### `apps\frontend\app\page.tsx`
```typescript
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}

```

---
## Frontend - Components

### `apps\frontend\components\ui\badge.tsx`
```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

```

### `apps\frontend\components\ui\button.tsx`
```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

### `apps\frontend\components\ui\card.tsx`
```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```

### `apps\frontend\components\ui\input.tsx`
```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```

### `apps\frontend\components\ui\label.tsx`
```typescript
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }

```

### `apps\frontend\components\ui\table.tsx`
```typescript
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

```

---
## Frontend - Lib/Utils

### `apps\frontend\lib\utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

---
## Frontend - Public Assets

### `apps\frontend\public\file.svg`
```text
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
```

### `apps\frontend\public\globe.svg`
```text
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
```

### `apps\frontend\public\next.svg`
```text
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
```

### `apps\frontend\public\vercel.svg`
```text
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
```

### `apps\frontend\public\window.svg`
```text
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
```

---
## Database Schema & Migrations

### `packages\database\prisma\migrations\20251027141750_auto_migration\migration.sql`
```sql
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "investment" DOUBLE PRECISION NOT NULL,
    "portfolioPercent" DOUBLE PRECISION NOT NULL,
    "exchange" TEXT NOT NULL,
    "marketCap" TEXT,
    "peRatioTTM" DOUBLE PRECISION,
    "latestEarnings" DOUBLE PRECISION,
    "revenueTTM" DOUBLE PRECISION,
    "ebitdaTTM" DOUBLE PRECISION,
    "ebitdaPercent" DOUBLE PRECISION,
    "pat" DOUBLE PRECISION,
    "patPercent" DOUBLE PRECISION,
    "cfoMarch24" DOUBLE PRECISION,
    "cfo5Years" DOUBLE PRECISION,
    "freeCashFlow5Years" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "bookValue" DOUBLE PRECISION,
    "revenueGrowth3Y" DOUBLE PRECISION,
    "ebitdaGrowth3Y" DOUBLE PRECISION,
    "profitGrowth3Y" DOUBLE PRECISION,
    "marketCapGrowth3Y" DOUBLE PRECISION,
    "priceToSales" DOUBLE PRECISION,
    "cfoToEbitda" DOUBLE PRECISION,
    "cfoToPat" DOUBLE PRECISION,
    "priceToBook" DOUBLE PRECISION,
    "stage2" TEXT,
    "salePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_data" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "presentValue" DOUBLE PRECISION NOT NULL,
    "gainLoss" DOUBLE PRECISION NOT NULL,
    "gainLossPercent" DOUBLE PRECISION NOT NULL,
    "peRatio" DOUBLE PRECISION,
    "dividendYield" DOUBLE PRECISION,
    "dayHigh" DOUBLE PRECISION,
    "dayLow" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_cache" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "peRatio" DOUBLE PRECISION,
    "marketCap" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "stocks_userId_idx" ON "stocks"("userId");

-- CreateIndex
CREATE INDEX "stocks_sector_idx" ON "stocks"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_userId_symbol_key" ON "stocks"("userId", "symbol");

-- CreateIndex
CREATE INDEX "price_data_stockId_timestamp_idx" ON "price_data"("stockId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "price_cache_symbol_key" ON "price_cache"("symbol");

-- CreateIndex
CREATE INDEX "price_cache_symbol_expiresAt_idx" ON "price_cache"("symbol", "expiresAt");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_data" ADD CONSTRAINT "price_data_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

```

### `packages\database\prisma\schema.prisma`
```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../client"
  binaryTargets   = ["native", "debian-openssl-3.0.x", "rhel-openssl-3.0.x"]
  previewFeatures = ["fullTextSearchPostgres"]
}


datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  email     String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stocks    Stock[]

  @@map("users")
}

model Stock {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  symbol           String
  name             String
  sector           String
  purchasePrice    Float
  quantity         Int
  investment       Float
  portfolioPercent Float
  exchange         String

  marketCap        String?
  peRatioTTM       Float?
  latestEarnings   Float?
  revenueTTM       Float?
  ebitdaTTM        Float?
  ebitdaPercent    Float?
  pat              Float?
  patPercent       Float?
  cfoMarch24       Float?
  cfo5Years        Float?
  freeCashFlow5Years Float?
  debtToEquity     Float?
  bookValue        Float?
  revenueGrowth3Y  Float?
  ebitdaGrowth3Y   Float?
  profitGrowth3Y   Float?
  marketCapGrowth3Y Float?
  priceToSales     Float?
  cfoToEbitda      Float?
  cfoToPat         Float?
  priceToBook      Float?
  stage2           String?
  salePrice        Float?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  priceData        PriceData[]

  @@unique([userId, symbol])
  @@index([userId])
  @@index([sector])
  @@map("stocks")
}

model PriceData {
  id              String   @id @default(uuid())
  stockId         String
  stock           Stock    @relation(fields: [stockId], references: [id], onDelete: Cascade)

  currentPrice    Float
  presentValue    Float
  gainLoss        Float
  gainLossPercent Float

  peRatio         Float?
  dividendYield   Float?
  dayHigh         Float?
  dayLow          Float?

  timestamp       DateTime @default(now())

  @@index([stockId, timestamp])
  @@map("price_data")
}

model PriceCache {
  id           String   @id @default(uuid())
  symbol       String   @unique
  currentPrice Float
  peRatio      Float?
  marketCap    String?
  cachedAt     DateTime @default(now())
  expiresAt    DateTime

  @@index([symbol, expiresAt])
  @@map("price_cache")
}

```

### `packages\database\prisma\seed.ts`
```typescript
import { PrismaClient } from '../client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('demo', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      password: hashedPassword,
      email: 'demo@portfolio.com',
    },
  });

  console.log('Created demo user:', user.username);

  const stocks = [
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank',
      sector: 'Financial Sector',
      purchasePrice: 1490,
      quantity: 50,
      investment: 74500,
      portfolioPercent: 5,
      exchange: 'NSE',
      peRatioTTM: 18.5,
      marketCap: '12,00,000 Cr',
      latestEarnings: 69181,
      revenueTTM: 321990,
    },
    {
      symbol: 'BAJFINANCE.NS',
      name: 'Bajaj Finance',
      sector: 'Financial Sector',
      purchasePrice: 6466,
      quantity: 15,
      investment: 96990,
      portfolioPercent: 6,
      exchange: 'NSE',
      peRatioTTM: 32.1,
      marketCap: '4,00,000 Cr',
      latestEarnings: 15375,
      revenueTTM: 62279,
    },
    {
      symbol: 'ICICIBANK.NS',
      name: 'ICICI Bank',
      sector: 'Financial Sector',
      purchasePrice: 1143,
      quantity: 70,
      investment: 80010,
      portfolioPercent: 5,
      exchange: 'NSE',
      peRatioTTM: 15.2,
    },
    {
      symbol: 'INFY.NS',
      name: 'Infosys',
      sector: 'Tech Sector',
      purchasePrice: 1450,
      quantity: 100,
      investment: 145000,
      portfolioPercent: 9,
      exchange: 'NSE',
      peRatioTTM: 24.5,
    },
    {
      symbol: 'TCS.NS',
      name: 'TCS',
      sector: 'Tech Sector',
      purchasePrice: 3500,
      quantity: 30,
      investment: 105000,
      portfolioPercent: 7,
      exchange: 'NSE',
      peRatioTTM: 28.3,
    },
    {
      symbol: 'DMART.NS',
      name: 'DMart',
      sector: 'Consumer Sector',
      purchasePrice: 3800,
      quantity: 25,
      investment: 95000,
      portfolioPercent: 6,
      exchange: 'NSE',
      peRatioTTM: 65.2,
    },
    {
      symbol: 'TATAPOWER.NS',
      name: 'Tata Power',
      sector: 'Power Sector',
      purchasePrice: 245,
      quantity: 200,
      investment: 49000,
      portfolioPercent: 3,
      exchange: 'NSE',
      peRatioTTM: 22.1,
    },
    {
      symbol: 'POLYCAB.NS',
      name: 'Polycab',
      sector: 'Pipe Sector',
      purchasePrice: 5200,
      quantity: 20,
      investment: 104000,
      portfolioPercent: 7,
      exchange: 'NSE',
      peRatioTTM: 28.9,
    },
  ];

  for (const stockData of stocks) {
    await prisma.stock.upsert({
      where: {
        userId_symbol: {
          userId: user.id,
          symbol: stockData.symbol,
        },
      },
      update: {},
      create: {
        userId: user.id,
        ...stockData,
      },
    });
  }

  console.log('Created', stocks.length, 'stocks');
  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```

---
## Root Config

### `.env`
```text
# =============================================================================
# PORTFOLIO DASHBOARD - ENVIRONMENT CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# Container/Image Configuration
# -----------------------------------------------------------------------------
# Set to "true" to use locally loaded images (for corporate networks/Bangalore)
# Leave empty to pull from Docker Hub (default for cloud deployments)
USE_LOCAL_IMAGES=true

# -----------------------------------------------------------------------------
# Node Environment
# -----------------------------------------------------------------------------
NODE_ENV=development
# Options: development, production, test

# -----------------------------------------------------------------------------
# Database Configuration (PostgreSQL)
# -----------------------------------------------------------------------------
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123
POSTGRES_DB=portfolio
DB_HOST=localhost
DB_PORT=5434

# Database URL for Prisma - MUST be hardcoded, no variable interpolation
DATABASE_URL=postgresql://postgres:123@localhost:5434/portfolio?schema=public

# Resource Limits
DB_MEMORY_LIMIT=512M
DB_CPU_LIMIT=1

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# -----------------------------------------------------------------------------
# Backend (NestJS) Configuration
# -----------------------------------------------------------------------------
BACKEND_PORT=3001

# -----------------------------------------------------------------------------
# Frontend (Next.js) Configuration
# -----------------------------------------------------------------------------
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000

# API URL for frontend to connect to backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# -----------------------------------------------------------------------------
# JWT Authentication Configuration
# -----------------------------------------------------------------------------
# Generate a secure secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_super_secure_random_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRATION=15m

# Refresh Token
JWT_REFRESH_SECRET=your_super_secure_refresh_token_secret_key_different_from_jwt_secret
JWT_REFRESH_EXPIRATION=7d

# -----------------------------------------------------------------------------
# Optional: Custom Volume Paths (uncomment to use local paths)
# -----------------------------------------------------------------------------
# DB_VOLUME_PATH=./data/postgres
# REDIS_VOLUME_PATH=./data/redis

# -----------------------------------------------------------------------------
# Optional: CORS Configuration
# -----------------------------------------------------------------------------
# CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# -----------------------------------------------------------------------------
# Optional: Logging
# -----------------------------------------------------------------------------
# LOG_LEVEL=debug

# -----------------------------------------------------------------------------
# CI/CD Configuration (automatically set by CI systems)
# -----------------------------------------------------------------------------
# CI=
# VERCEL=
# VERCEL_ENV=
# VERCEL_URL=

```

### `package.json`
```json
{
  "name": "portfolio-dashboard",
  "version": "1.0.0",
  "private": true,
  "description": "Dynamic Portfolio Dashboard - Real-time stock tracking with Next.js, NestJS, Prisma, and PostgreSQL",
  "author": "Zahid Khan (@zahidkhandev)",
  "license": "MIT",
  "packageManager": "npm@11.6.2",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:backend": "turbo run dev --filter=@repo/backend",
    "dev:frontend": "turbo run dev --filter=@repo/frontend",
    "dev:parallel": "turbo run dev --filter=@repo/backend --filter=@repo/frontend",
    "build": "turbo run build",
    "build:backend": "turbo run build --filter=@repo/backend",
    "build:frontend": "turbo run build --filter=@repo/frontend",
    "start": "turbo run start",
    "start:backend": "turbo run start --filter=@repo/backend",
    "start:frontend": "turbo run start --filter=@repo/frontend",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "type-check": "turbo run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rimraf node_modules",
    "clean:all": "npm run clean && rimraf **/node_modules **/.turbo **/dist",
    "db:generate": "npm run db:generate --workspace=@repo/database",
    "db:migrate": "npm run db:migrate --workspace=@repo/database",
    "db:migrate:create": "npm run db:migrate:create --workspace=@repo/database",
    "db:migrate:deploy": "npm run db:migrate:deploy --workspace=@repo/database",
    "db:migrate:status": "npm run db:migrate:status --workspace=@repo/database",
    "db:migrate:resolve": "npm run db:migrate:resolve --workspace=@repo/database",
    "db:push": "npm run db:push --workspace=@repo/database",
    "db:studio": "npm run db:studio --workspace=@repo/database",
    "db:seed": "npm run db:seed --workspace=@repo/database",
    "db:reset": "npm run db:reset --workspace=@repo/database",
    "podman:machine:init": "podman machine init",
    "podman:machine:start": "podman machine start",
    "podman:machine:stop": "podman machine stop",
    "podman:machine:restart": "podman machine stop && podman machine start",
    "podman:machine:status": "podman machine list",
    "podman:machine:ssh": "podman machine ssh",
    "podman:db:up": "podman compose --env-file .env -f docker/db-docker-compose.yaml up -d",
    "podman:db:down": "podman compose --env-file .env -f docker/db-docker-compose.yaml down",
    "podman:db:restart": "npm run podman:db:down && npm run podman:db:up",
    "podman:db:logs": "podman compose --env-file .env -f docker/db-docker-compose.yaml logs -f",
    "podman:db:ps": "podman compose --env-file .env -f docker/db-docker-compose.yaml ps",
    "podman:db:clean": "podman compose --env-file .env -f docker/db-docker-compose.yaml down -v",
    "podman:redis:up": "podman compose --env-file .env -f docker/redis-docker-compose.yaml up -d",
    "podman:redis:down": "podman compose --env-file .env -f docker/redis-docker-compose.yaml down",
    "podman:redis:restart": "npm run podman:redis:down && npm run podman:redis:up",
    "podman:redis:logs": "podman compose --env-file .env -f docker/redis-docker-compose.yaml logs -f",
    "podman:redis:ps": "podman compose --env-file .env -f docker/redis-docker-compose.yaml ps",
    "podman:all:up": "npm run podman:db:up && npm run podman:redis:up",
    "podman:all:down": "npm run podman:db:down && npm run podman:redis:down",
    "podman:all:restart": "npm run podman:all:down && npm run podman:all:up",
    "podman:all:ps": "podman ps -a",
    "podman:all:logs": "podman ps -q | xargs podman logs",
    "podman:ps": "podman ps",
    "podman:ps:all": "podman ps -a",
    "podman:images": "podman images",
    "podman:stats": "podman stats --no-stream",
    "podman:load:postgres": "podman load -i scripts/data/library_postgres_16-alpine_amd64.tar",
    "podman:load:redis": "podman load -i scripts/data/library_redis_7-alpine_amd64.tar",
    "podman:load:all": "npm run podman:load:postgres && npm run podman:load:redis",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:cov": "turbo run test:cov",
    "check": "npm run type-check && npm run lint && npm run format:check",
    "fix": "npm run lint:fix && npm run format",
    "env:setup": "cp .env.example .env && echo 'Please edit .env with your values'",
    "env:generate-jwt": "node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))\"",
    "env:validate": "node -e \"require('dotenv').config(); console.log('âœ“ Environment variables loaded successfully')\"",
    "setup": "npm run env:setup && npm run podman:all:up && npm run db:generate && npm run db:migrate:deploy",
    "setup:fresh": "npm run podman:all:up && npm run db:generate && npm run db:migrate:deploy && npm run db:seed"
  },
  "devDependencies": {
    "@types/node": "^24.9.1",
    "prettier": "^3.6.2",
    "rimraf": "^6.0.1",
    "turbo": "^2.5.8",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "axios": "^1.12.2",
    "date-fns": "^4.1.0",
    "swr": "^2.3.6"
  }
}

```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "build/**",
        "node_modules/.prisma/**",
        "node_modules/@prisma/**",
        "tsconfig.tsbuildinfo"
      ],
      "env": [
        "DATABASE_URL",
        "NODE_ENV",
        "BACKEND_PORT",
        "FRONTEND_PORT",
        "REDIS_HOST",
        "REDIS_PORT",
        "NEXT_PUBLIC_API_URL",
        "JWT_SECRET",
        "JWT_EXPIRATION"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^db:generate"],
      "env": [
        "DATABASE_URL",
        "NODE_ENV",
        "BACKEND_PORT",
        "FRONTEND_PORT",
        "REDIS_HOST",
        "REDIS_PORT",
        "NEXT_PUBLIC_API_URL",
        "JWT_SECRET",
        "JWT_EXPIRATION",
        "FRONTEND_URL"
      ]
    },
    "start": {
      "cache": false,
      "persistent": true,
      "env": ["DATABASE_URL", "NODE_ENV", "BACKEND_PORT", "FRONTEND_PORT", "NEXT_PUBLIC_API_URL"]
    },
    "db:generate": {
      "cache": true,
      "outputs": ["node_modules/.prisma/**", "node_modules/@prisma/**"],
      "env": ["DATABASE_URL"],
      "persistent": false
    },
    "db:migrate": {
      "cache": false,
      "dependsOn": ["^db:generate"],
      "env": ["DATABASE_URL"]
    },
    "db:push": {
      "cache": false,
      "env": ["DATABASE_URL"]
    },
    "db:studio": {
      "cache": false,
      "persistent": true,
      "env": ["DATABASE_URL"]
    },
    "db:seed": {
      "cache": false,
      "env": ["DATABASE_URL"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "lint:fix": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"],
      "env": ["NODE_ENV"]
    },
    "format": {
      "cache": false
    },
    "format:check": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "env": ["DATABASE_URL", "NODE_ENV"]
    },
    "clean": {
      "cache": false
    }
  },
  "globalEnv": [
    "NODE_ENV",
    "DATABASE_URL",
    "BACKEND_PORT",
    "FRONTEND_PORT",
    "NEXT_PUBLIC_API_URL",
    "JWT_SECRET",
    "JWT_EXPIRATION",
    "REDIS_HOST",
    "REDIS_PORT",
    "FRONTEND_URL",
    "CI"
  ],
  "globalPassThroughEnv": ["CI", "VERCEL", "VERCEL_ENV", "VERCEL_URL"]
}

```

---
## Backend Config

### `apps\backend\nest-cli.json`
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}

```

### `apps\backend\package.json`
```json
{
  "name": "@repo/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix"
  },
  "dependencies": {
    "@nestjs/cache-manager": "^3.0.1",
    "@nestjs/common": "^11.1.8",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.1.8",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.1.8",
    "@nestjs/platform-socket.io": "^11.1.8",
    "@nestjs/schedule": "^6.0.1",
    "@nestjs/swagger": "^11.2.1",
    "@nestjs/websockets": "^11.1.8",
    "@repo/database": "*",
    "axios": "^1.12.2",
    "bcrypt": "^6.0.0",
    "cache-manager": "^7.2.4",
    "cheerio": "^1.1.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "socket.io": "^4.8.1",
    "yahoo-finance2": "^3.10.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.10",
    "@nestjs/schematics": "^11.0.9",
    "@nestjs/testing": "^11.1.8",
    "@types/bcrypt": "^6.0.0",
    "@types/express": "^5.0.4",
    "@types/node": "^24.9.1",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "@typescript-eslint/eslint-plugin": "^8.46.2",
    "@typescript-eslint/parser": "^8.46.2",
    "eslint": "^9.38.0",
    "prettier": "^3.6.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}

```

### `apps\backend\tsconfig.json`
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}

```

---
## Frontend Config

### `apps\frontend\components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}

```

### `apps\frontend\eslint.config.mjs`
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

```

### `apps\frontend\next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

```

### `apps\frontend\next-env.d.ts`
```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.

```

### `apps\frontend\package.json`
```json
{
  "name": "@repo/frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.548.0",
    "next": "16.0.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tailwind-merge": "^3.3.1",
    "swr": "^2.3.6",
    "axios": "^1.12.2",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.0",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}

```

### `apps\frontend\postcss.config.mjs`
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

### `apps\frontend\tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts",
    ".next\\dev/types/**/*.ts",
    ".next\\dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}

```

---
## Summary: 54 files, 0.07 MB
