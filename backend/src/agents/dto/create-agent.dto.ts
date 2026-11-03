import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
} from "class-validator";
import { Role } from "../../common/enums/role.enum";
import { StrongPassword } from "../../common/decorators/strong-password.decorator";

export enum AgentType {
  FIELD = 'FIELD',
  OFFICE = 'OFFICE',
}

export class CreateAgentDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @StrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;
}