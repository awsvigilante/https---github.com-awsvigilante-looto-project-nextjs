/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent Next.js from bundling @react-pdf/renderer — it must run as native Node.js
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {
    root: '.'
  }
}

export default nextConfig
