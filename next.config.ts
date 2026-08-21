import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json further up the tree would
  // otherwise make Turbopack infer the home directory as the project root.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
