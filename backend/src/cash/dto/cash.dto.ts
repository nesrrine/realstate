import {
  IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const CASH_ENTRY_TYPES = ["VISIT_FEE", "EXPENSE"];
export const EXPENSE_CATEGORIES = ["TRANSPORT", "FUEL", "PHONE", "OFFICE", "ADVERTISING", "MEAL", "OTHER"];
export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "CHECK"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCashEntryDto {
  @ApiProperty({ enum: CASH_ENTRY_TYPES })
  @IsIn(CASH_ENTRY_TYPES)
  type: "VISIT_FEE" | "EXPENSE";

  @ApiProperty({ example: "2026-11-02", description: "Jour de l'opération (YYYY-MM-DD)" })
  @Matches(DAY, { message: "date doit être au format YYYY-MM-DD" })
  date: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: "Frais de visite – appartement Aouina" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ enum: EXPENSE_CATEGORIES, description: "Dépenses uniquement" })
  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: "Visite concernée (frais de visite)" })
  @IsOptional()
  @IsString()
  visitId?: string;
}

export class CashDayQueryDto {
  @ApiProperty({ example: "2026-11-02" })
  @Matches(DAY, { message: "date doit être au format YYYY-MM-DD" })
  date: string;
}

export class CashSummaryQueryDto {
  @ApiProperty({ example: "2026-10-01" })
  @Matches(DAY, { message: "from doit être au format YYYY-MM-DD" })
  from: string;

  @ApiProperty({ example: "2026-11-02" })
  @Matches(DAY, { message: "to doit être au format YYYY-MM-DD" })
  to: string;
}

/** Frais de visite standard (DT). */
export const DEFAULT_VISIT_FEE = 20;

export class VisitFeeDto {
  @ApiProperty({ example: true, description: "Frais payé par le client ?" })
  @IsBoolean()
  paid: boolean;

  @ApiProperty({ example: "2026-11-02", description: "Jour de l'encaissement (YYYY-MM-DD)" })
  @Matches(DAY, { message: "date doit être au format YYYY-MM-DD" })
  date: string;

  @ApiPropertyOptional({ example: DEFAULT_VISIT_FEE, default: DEFAULT_VISIT_FEE })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: string;
}

export class CashAccessDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}
