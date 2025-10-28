import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

interface User {
  id: string;
  username: string;
  email: string | null;
}

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    return user?.id;
  },
);
