import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { StrongPassword } from "../../common/decorators/strong-password.decorator";

export class ChangePasswordDto {
  @ApiProperty({ example: "AncienMotDePasse123!" })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: "NouveauMotDePasse456!" })
  @StrongPassword()
  newPassword: string;
}
