import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "scripts/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // useEffect(() => { asyncFn() }, [deps]) is a standard data-fetching pattern
      '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // missing deps in effects that use stable async functions defined in the component
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);

export default eslintConfig;
