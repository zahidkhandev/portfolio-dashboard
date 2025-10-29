import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

interface User {
  id: number;
  username: string;
  email: string | null;
}

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    return user?.id;
  },
);
