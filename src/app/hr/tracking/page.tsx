"use client";

import { TrackingMatrix } from "@/components/tracking/TrackingMatrix";

export default function HRTrackingPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Tracking Matrix
      </h1>
      <TrackingMatrix />
    </div>
  );
}
