import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A parent lockfile must not make Turbopack resolve this app's CSS from outside the repo.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // Ignore 'canvas' missing module error since pdfjs-dist optionally tries to require it,
  // but we strictly use pdfjs for text extraction and don't need server-side rendering of pages.
  serverExternalPackages: ["canvas", "pdfjs-dist"],
};

export default nextConfig;
