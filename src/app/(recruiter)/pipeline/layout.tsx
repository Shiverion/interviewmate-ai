"use client";

import { PipelineDraftProvider } from "./PipelineDraftContext";

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <PipelineDraftProvider>{children}</PipelineDraftProvider>;
}
