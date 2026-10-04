import type { NextConfig } from "next";

// Next rejects a server action ("Invalid Server Actions request") when the browser's origin
// differs from the host the server sees. In GitHub Codespaces they always differ, in one of
// two ways depending on how the app is opened:
//   - in the browser at <codespace>-<port>.<domain>, while the server sees localhost;
//   - at localhost through VS Code's port forwarding, while the tunnel reports the
//     <codespace>-<port>.<domain> host to the server.
// So during development both this codespace's forwarded origins and local origins are allowed.
// A production build allows neither.
const ports = [3000, 3001, 3002, 3003, 3004, 3005];
const development = process.env.NODE_ENV !== "production";
const codespace = process.env.CODESPACE_NAME;
const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

const allowedOrigins = development
  ? [
      ...ports.flatMap((port) => [`localhost:${port}`, `127.0.0.1:${port}`]),
      ...(codespace && domain ? ports.map((port) => `${codespace}-${port}.${domain}`) : []),
    ]
  : [];

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins } },
};

export default nextConfig;
