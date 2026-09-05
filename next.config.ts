import { localNetworkHosts } from "./lib/network";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks JS/HMR for any host that isn't localhost. Allow this
  // machine's LAN addresses so opening the Network URL still hydrates.
  allowedDevOrigins: localNetworkHosts(),
  transpilePackages: ["@codesandbox/sandpack-react"],
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
