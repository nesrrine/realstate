import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CommissionStatsDto {
  @ApiPropertyOptional({ description: "Filter by field agent ID" })
  @IsOptional()
  @IsString()
  fieldAgentId?: string;

  @ApiPropertyOptional({ description: "Filter by office agent ID" })
  @IsOptional()
  @IsString()
  officeAgentId?: string;

  @ApiPropertyOptional({ description: "Start date (ISO format)" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO format)" })
  @IsOptional()
  @IsString()
  endDate?: string;
}
