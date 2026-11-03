// Configuration ESLint du backend (NestJS + TypeScript).
// La mise en forme reste à Prettier ; ESLint vérifie les erreurs de code.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: ["plugin:@typescript-eslint/recommended", "prettier"],
  env: { node: true, jest: true },
  ignorePatterns: [".eslintrc.js", "dist", "node_modules"],
  rules: {
    // Le code existant type souvent l'utilisateur courant en `any` (décorateur @CurrentUser)
    "@typescript-eslint/no-explicit-any": "off",
    // args: "none" -> les services gardent le paramètre user même quand ils ne l'utilisent pas
    // ignoreRestSiblings -> const { passwordHash, ...safe } = user pour exclure un champ
    "@typescript-eslint/no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true, varsIgnorePattern: "^_" }],
  },
};
