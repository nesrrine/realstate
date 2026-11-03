import { applyDecorators } from "@nestjs/common";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

/** Mot de passe du personnel : 10 caractères minimum, avec au moins une lettre et un chiffre. */
export const StrongPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(10, { message: "Le mot de passe doit contenir au moins 10 caractères" }),
    MaxLength(128),
    Matches(/^(?=.*\p{L})(?=.*\d)/u, { message: "Le mot de passe doit contenir des lettres et des chiffres" }),
  );
