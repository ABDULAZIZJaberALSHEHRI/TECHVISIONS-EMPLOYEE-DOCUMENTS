"use client";

import { RequestForm } from "@/components/requests/RequestForm";
import { PageContainer, PageHeader, FormContainer } from "@/components/modern";

export default function DeptHeadNewRequestPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Create Department Request"
        description="Create a document request for your department members"
      />
      <FormContainer>
        <RequestForm redirectPath="/dept-head/requests" />
      </FormContainer>
    </PageContainer>
  );
}
