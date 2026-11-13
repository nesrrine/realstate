
import {
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
} from "class-validator";

import { AgentType } from "./create-agent.dto";

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

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
  @IsEnum(AgentType)
  agentType?: AgentType;
}
