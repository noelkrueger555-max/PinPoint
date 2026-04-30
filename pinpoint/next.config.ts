import type { NextConfig } from "next";

// Build identifier — used to bust the service-worker cache on every deploy.
// Vercel sets VERCEL_GIT_COMMIT_SHA; locally we fall back to a fresh stamp
// per `next build` invocation (re-evaluated on each cold start in dev).
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  Date.now().toString(36);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
};

export default nextConfig;
