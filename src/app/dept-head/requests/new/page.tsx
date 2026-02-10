"use client";

import { RequestForm } from "@/components/requests/RequestForm";

export default function DeptHeadNewRequestPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Create Department Request
      </h1>
      <RequestForm redirectPath="/dept-head/requests" />
    </div>
  );
}
