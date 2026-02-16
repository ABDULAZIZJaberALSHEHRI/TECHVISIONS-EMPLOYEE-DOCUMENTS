"use client";

import { RequestForm } from "@/components/requests/RequestForm";
import { PageContainer, PageHeader, FormContainer } from "@/components/modern";

export default function NewRequestPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Create New Request"
        description="Create a new document request for employees"
      />
      <FormContainer>
        <RequestForm />
      </FormContainer>
    </PageContainer>
  );
}
