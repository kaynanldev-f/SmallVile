import type { NextConfig } from "next";
import { MAX_UPLOAD_BYTES } from "./src/utils/upload";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["react-icons"],

    // Cadastro de filme e de produto sobem imagens por Server Action; o
    // padrão de 1 MB estoura no primeiro banner.
    serverActions: {
      bodySizeLimit: MAX_UPLOAD_BYTES,
    },
  },

  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
};

export default nextConfig;
