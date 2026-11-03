import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AgentFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  // "true" / "false" depuis la query string
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" || value === true || value === "1" || value === 1
      ? true
      : value === "false" || value === false || value === "0" || value === 0
        ? false
        : undefined,
  )
  isActive?: boolean;

  // Agent terrain (visites sur place) ou bureau (accueil, planification)
  @IsOptional()
  @IsIn(["FIELD", "OFFICE"])
  agentType?: "FIELD" | "OFFICE";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn(["createdAt", "lastName", "firstName"])
  sortBy?: "createdAt" | "lastName" | "firstName";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}