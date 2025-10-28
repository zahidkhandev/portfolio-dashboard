import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'zahid', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'zahid@test.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'pass123',
    description: 'Password (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;
}
