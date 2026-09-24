import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json further up the tree would
  // otherwise make Turbopack infer the home directory as the project root.
  turbopack: { root: path.resolve(process.cwd()) },
  // The fretboard was Play and the stand hung off /play. Old links and Home
  // Screen icons still land, query string and all.
  redirects() {
    return [
      { source: "/play", destination: "/practice", permanent: false },
      { source: "/songs/:slug/play", destination: "/songs/:slug/stand", permanent: false },
    ];
  },
};

export default nextConfig;
