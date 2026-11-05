/**
 * Crée une archive ZIP compatible avec archiver v7 (fonction) et v8 (classe ZipArchive).
 * Utilise require() + `any` pour éviter les erreurs de types entre versions.
 */
export function createZipArchive(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: any = require("archiver");
  const options = { zlib: { level: 9 } };

  if (typeof mod === "function") return mod("zip", options);               // v7 et avant
  if (mod?.ZipArchive) return new mod.ZipArchive(options);                 // v8
  if (typeof mod?.default === "function") return mod.default("zip", options);
  if (mod?.default?.ZipArchive) return new mod.default.ZipArchive(options);

  throw new Error(
    `Module archiver incompatible (type: ${typeof mod}, clés: ${Object.keys(mod ?? {}).join(", ")})`,
  );
}

/** Extrait un message d'erreur d'une valeur `unknown` (variables de catch en mode strict). */
export function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}