import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
export default defineConfig([...next,globalIgnores([".next/**","data/**","research-cache/**"]),{rules:{"@next/next/no-img-element":"off"}}]);
