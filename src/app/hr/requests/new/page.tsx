"use client";

import { RequestForm } from "@/components/requests/RequestForm";

export default function NewRequestPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1B4F72]">
        Create New Request
      </h1>
      <RequestForm />
    </div>
  );
}
