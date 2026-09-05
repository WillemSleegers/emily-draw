import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Allow the dev server to be reached from other devices on the LAN (the
  // iPad) without Next blocking its dev-only assets and HMR socket.
  //
  // A whole-subnet wildcard rather than fixed addresses: the iPad's DHCP lease
  // moves, and a stale entry here fails as a dead page rather than an obvious
  // config error. Dev-only - this has no effect on `next build`/`next start`.
  allowedDevOrigins: ["192.168.68.*"],
}

export default nextConfig
