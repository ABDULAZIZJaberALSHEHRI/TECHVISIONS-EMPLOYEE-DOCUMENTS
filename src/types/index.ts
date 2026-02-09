import type {
  Role,
  Priority,
  RequestStatus,
  AssignmentStatus,
  NotificationType,
} from "@prisma/client";

export type { Role, Priority, RequestStatus, AssignmentStatus, NotificationType };

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  image?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalRequests: number;
  pendingSubmissions: number;
  submittedAwaitingReview: number;
  overdue: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
}

export interface EmployeeDashboardStats {
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface RequestFormData {
  title: string;
  description: string;
  categoryId: string | null;
  deadline: string;
  priority: Priority;
  acceptedFormats: string;
  maxFileSizeMb: number;
  notes: string;
  employeeIds: string[];
  department: string | null;
  assignAll: boolean;
}

export interface ReviewData {
  action: "APPROVED" | "REJECTED";
  note?: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  role: Role;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: {
    requests: number;
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
}
