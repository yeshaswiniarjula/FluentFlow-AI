/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to successfully complete even if the project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to successfully complete even if the project has TypeScript errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
