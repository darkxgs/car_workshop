import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off root-level maintenance/seed/scratch scripts — not part of the app
    // (the application source lives entirely under src/). Kept in the repo for
    // manual use, but excluded from the app's lint signal.
    "scratch_*.{js,mjs}",
    "migrate*.{js,mjs}",
    "seed*.{js,mjs}",
    "wipe*.{js,mjs}",
    "check-*.{js,mjs}",
    "check_*.{js,mjs}",
    "run-*.{js,mjs}",
    "run_*.{js,mjs}",
    "copy_parts.mjs",
  ]),
]);

export default eslintConfig;
