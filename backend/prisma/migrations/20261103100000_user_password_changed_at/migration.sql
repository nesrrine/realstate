-- Révocation des sessions après changement de mot de passe
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
