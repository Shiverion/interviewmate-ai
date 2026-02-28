import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore 'canvas' missing module error since pdfjs-dist optionally tries to require it,
  // but we strictly use pdfjs for text extraction and don't need server-side rendering of pages.
  serverExternalPackages: ["canvas", "pdfjs-dist"],
};

export default nextConfig;
