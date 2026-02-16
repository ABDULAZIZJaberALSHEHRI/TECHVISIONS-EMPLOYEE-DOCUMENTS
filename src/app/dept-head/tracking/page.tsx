"use client";

import { TrackingMatrix } from "@/components/tracking/TrackingMatrix";
import { PageContainer, PageHeader } from "@/components/modern";

export default function DeptHeadTrackingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Department Tracking Matrix"
        description="Monitor document submissions for your department"
      />
      <TrackingMatrix />
    </PageContainer>
  );
}
