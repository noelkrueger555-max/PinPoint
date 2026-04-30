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
  ]),
  {
    rules: {
      // React 19's new `react-hooks/set-state-in-effect` flags the textbook
      // one-shot data-fetch pattern (`useEffect(() => { setLoading(true);
      // fetch().then(setData); }, []);`) which is officially documented and
      // safe. Keep visibility but don't fail builds.
      "react-hooks/set-state-in-effect": "warn",
      // `react-hooks/purity` lexically flags `performance.now()` /
      // `Date.now()` even inside event handlers (which are not part of
      // render). Downgrade to a warning so it stays surfaced without
      // breaking builds.
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
