"use client";

import { TrackingMatrix } from "@/components/tracking/TrackingMatrix";

export default function DeptHeadTrackingPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Department Tracking Matrix
      </h1>
      <TrackingMatrix />
    </div>
  );
}
