"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EmployeeProfile } from "@/components/employees/EmployeeProfile";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import type { AssignmentStatus, Priority } from "@prisma/client";

interface UserData {
  id: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  _count: { assignments: number; documents: number };
}

interface Assignment {
  id: string;
  status: AssignmentStatus;
  dueDate: string;
  request: { id: string; title: string; priority: Priority };
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, requestsRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/requests?pageSize=100`),
        ]);
        const userData = await userRes.json();
        const requestsData = await requestsRes.json();

        if (userData.success) setUser(userData.data);

        // Extract this employee's assignments from all requests
        if (requestsData.success) {
          const empAssignments: Assignment[] = [];
          for (const req of requestsData.data) {
            if (req.assignments) {
              for (const a of req.assignments) {
                if (a.employeeId === id || req.assignments.some(
                  (asn: { id: string }) => asn.id
                )) {
                  empAssignments.push({
                    id: a.id,
                    status: a.status,
                    dueDate: req.deadline,
                    request: {
                      id: req.id,
                      title: req.title,
                      priority: req.priority,
                    },
                  });
                }
              }
            }
          }
          setAssignments(empAssignments);
        }
      } catch (error) {
        console.error("Failed to fetch employee:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!user) return <div>Employee not found</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Employee Profile
      </h1>
      <EmployeeProfile user={user} assignments={assignments} />
    </div>
  );
}
