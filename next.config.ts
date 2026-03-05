import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled: Strict Mode's double-invoke was crashing Tldraw canvas
};

export default nextConfig;
