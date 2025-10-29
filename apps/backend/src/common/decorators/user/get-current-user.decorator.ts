import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

interface User {
  id: number;
  username: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const GetCurrentUser = createParamDecorator(
  (data: keyof User | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (data) {
      return user[data];
    }
    return user;
  },
);
