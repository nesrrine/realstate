import { IsOptional, IsString, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DashboardFilterDto {
  @ApiPropertyOptional({ description: "Start date (ISO format)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO format)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Filter by agent ID" })
  @IsOptional()
  @IsString()
  agentId?: string;
}
