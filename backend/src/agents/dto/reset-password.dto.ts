import { StrongPassword } from "../../common/decorators/strong-password.decorator";

export class ResetPasswordDto {
  @StrongPassword()
  password: string;
}
