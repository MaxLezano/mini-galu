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
  // ninguna página se muestra dentro de un iframe ajeno (el panel no se puede "tapar" con otra página encima)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
