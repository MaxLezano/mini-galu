import { resolve } from "node:path";
import type { NextConfig } from "next";

// El .env vive en la raíz del monorepo.
try {
  process.loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {}

const config: NextConfig = {
  transpilePackages: ["@mini-galu/contracts", "@mini-galu/design-tokens"],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  },
  reactStrictMode: true,
};

export default config;
