import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isE2E = process.env.NEXT_PUBLIC_E2E_TEST === "true";
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  ...(isE2E && {
    webpack: (config) => {
      // Use full resolved paths as keys — Next.js resolves @/ before webpack alias
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.resolve(__dirname, "lib/firebase.ts")]: path.resolve(__dirname, "lib/__e2e__/firebase.ts"),
        [path.resolve(__dirname, "lib/firestore.ts")]: path.resolve(__dirname, "lib/__e2e__/firestore.ts"),
        [path.resolve(__dirname, "lib/firebase-admin.ts")]: path.resolve(__dirname, "lib/__e2e__/firebase-admin.ts"),
        [path.resolve(__dirname, "context/AuthContext.tsx")]: path.resolve(__dirname, "lib/__e2e__/AuthContext.tsx"),
        [path.resolve(__dirname, "lib/env-check.ts")]: path.resolve(__dirname, "lib/__e2e__/env-check.ts"),
      };
      return config;
    },
  }),
};

export default nextConfig;
