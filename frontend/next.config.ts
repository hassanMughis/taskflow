import type { NextConfig } from "next";
import path from "node:path";

const stableProductionApiUrl = "https://kanvero-api-hassanmughis-projects.vercel.app";
const retiredDeploymentApiUrl = "https://kanvero-8f28vlpbe-hassanmughis-projects.vercel.app";
const configuredApiUrl = process.env.API_BASE_URL?.replace(/\/$/, "");

// The original Vercel setting pointed at one immutable deployment, so later
// backend releases never reached the frontend. Migrate that retired value to
// the backend project's stable production domain while preserving custom URLs.
const apiBaseUrl = configuredApiUrl === retiredDeploymentApiUrl
  ? stableProductionApiUrl
  : configuredApiUrl ?? (process.env.VERCEL ? stableProductionApiUrl : "http://localhost:3000");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
