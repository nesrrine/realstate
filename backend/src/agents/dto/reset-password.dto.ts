
import { IsNotEmpty, IsString } from "class-validator";
import { StrongPassword } from "../../common/decorators/strong-password.decorator";

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: "Le mot de passe est obligatoire" })
  @StrongPassword()
  password: string;
}
