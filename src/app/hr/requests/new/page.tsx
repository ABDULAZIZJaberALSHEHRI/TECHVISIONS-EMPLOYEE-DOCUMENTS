"use client";

import { RequestForm } from "@/components/requests/RequestForm";

export default function NewRequestPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Create New Request
      </h1>
      <RequestForm />
    </div>
  );
}
