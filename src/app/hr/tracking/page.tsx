"use client";

import { TrackingMatrix } from "@/components/tracking/TrackingMatrix";
import { PageContainer, PageHeader } from "@/components/modern";

export default function HRTrackingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Tracking Matrix"
        description="Monitor and track all document request assignments"
      />
      <TrackingMatrix />
    </PageContainer>
  );
}
