import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  eslintConfigPrettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);