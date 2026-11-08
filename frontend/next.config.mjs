import path from "node:path";

const apiProxy = process.env.API_PROXY_URL || "http://127.0.0.1:8000";
const isStaticExport = process.env.NEXT_OUTPUT_MODE === "export";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(isStaticExport
    ? {
        output: "export",
        distDir: "out",
      }
    : {
        outputFileTracingRoot: path.join(process.cwd(), ".."),
      }),
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    middlewareClientMaxBodySize: "60mb",
    proxyTimeout: 120_000,
  },
  async rewrites() {
    // When running on Vercel without an external backend, route to the Python serverless function
    if (process.env.VERCEL && !process.env.API_PROXY_URL) {
      return [{ source: "/backend/:path*", destination: "/api/index.py" }];
    }
    return [{ source: "/backend/:path*", destination: `${apiProxy}/:path*` }];
  },
};

export default nextConfig;
