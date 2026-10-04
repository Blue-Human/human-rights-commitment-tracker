import type { NextConfig } from "next";

// GitHub Codespaces serves the dev server at <codespace>-<port>.<domain>, so the browser's
// origin differs from the host the server sees and Next rejects server actions (its CSRF
// check) with "Invalid Server Actions request". Allow this codespace's own forwarded
// origins; outside Codespaces nothing is added.
const codespace = process.env.CODESPACE_NAME;
const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedOrigins = codespace && domain ? [3000, 3001, 3002, 3003].map((port) => `${codespace}-${port}.${domain}`) : [];

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins } },
};

export default nextConfig;
