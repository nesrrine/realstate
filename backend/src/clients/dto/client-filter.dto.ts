import { IsOptional, IsString, IsBoolean, IsEnum } from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType, ContactStatus, FollowUpStatus } from "@prisma/client";
import { ClientType } from "./create-client.dto";

export class ClientFilterDto {
  // Pagination
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) limit?: number = 20;

  // Search
  @ApiPropertyOptional({ description: "Search in name, email, phone" })
  @IsOptional() @IsString() search?: string;

  // Filters
  @ApiPropertyOptional() @IsOptional() @IsString() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional({ enum: TransactionType }) @IsOptional() @IsEnum(TransactionType) transactionType?: TransactionType;
  @ApiPropertyOptional({ enum: ClientType }) @IsOptional() @IsEnum(ClientType) clientType?: ClientType;
  @ApiPropertyOptional({ enum: ContactStatus, description: "Filter by contact status: PROSPECT or CLIENT" })
  @IsOptional() @IsEnum(ContactStatus) status?: ContactStatus;
  @ApiPropertyOptional({ enum: FollowUpStatus, description: "Filter by follow-up status" })
  @IsOptional() @IsEnum(FollowUpStatus) followUpStatus?: FollowUpStatus;
  @ApiPropertyOptional({ description: "Filter by next follow-up date (ISO string)" })
  @IsOptional() @Type(() => Date) nextFollowUpAt?: Date;
  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => value === "true" || value === true) @IsBoolean()
  isActive?: boolean;

  // Sort
  @ApiPropertyOptional({ enum: ["createdAt", "lastName", "firstName", "updatedAt"], default: "createdAt" })
  @IsOptional() @IsString() sortBy?: string = "createdAt";
  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional() @IsString() sortOrder?: "asc" | "desc" = "desc";
}
