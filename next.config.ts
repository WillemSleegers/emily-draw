import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow the dev server to be reached from other devices on the LAN
  // (e.g. an iPad at this address) without a cross-origin warning.
  allowedDevOrigins: ["192.168.68.56", "192.168.68.59"],
}

export default nextConfig
