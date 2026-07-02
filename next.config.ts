import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs-dist) loads its worker module at runtime by path; bundling
  // it breaks that resolution ("Cannot find module …pdf.worker.mjs"). Keep it
  // external so it resolves from node_modules.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
