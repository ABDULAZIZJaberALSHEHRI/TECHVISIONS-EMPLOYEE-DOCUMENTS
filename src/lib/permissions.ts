import type { Role } from "@prisma/client";

interface UserForPermissions {
  id: string;
  role: Role;
  department: string | null;
  managedDepartment?: string | null;
}

/**
 * Check if a user can create requests for a given department.
 * - ADMIN/HR: can create for any department
 * - DEPARTMENT_HEAD: can only create for their managed department
 * - EMPLOYEE: cannot create requests
 */
export function canCreateRequestForDepartment(
  user: UserForPermissions,
  department: string
): boolean {
  if (user.role === "ADMIN" || user.role === "HR") return true;
  if (user.role === "DEPARTMENT_HEAD") {
    return user.managedDepartment === department;
  }
  return false;
}

/**
 * Check if user can create requests (any target type).
 */
export function canCreateRequests(user: UserForPermissions): boolean {
  return ["ADMIN", "HR", "DEPARTMENT_HEAD"].includes(user.role);
}

/**
 * Check if a user can view the tracking matrix for a department.
 * - ADMIN/HR: can view all
 * - DEPARTMENT_HEAD: can only view their managed department
 * - EMPLOYEE: cannot view tracking matrix
 */
export function canViewTrackingMatrix(
  user: UserForPermissions,
  department?: string
): boolean {
  if (user.role === "ADMIN" || user.role === "HR") return true;
  if (user.role === "DEPARTMENT_HEAD") {
    if (!department) return true; // Will be filtered to their department
    return user.managedDepartment === department;
  }
  return false;
}

/**
 * Check if a user can send reminders to given employees.
 * - ADMIN/HR: can send to anyone
 * - DEPARTMENT_HEAD: can only send to employees in their managed department
 * - EMPLOYEE: cannot send reminders
 */
export function canSendReminders(user: UserForPermissions): boolean {
  return ["ADMIN", "HR", "DEPARTMENT_HEAD"].includes(user.role);
}

/**
 * Get the departments a user can access.
 * - ADMIN/HR: "ALL" (no restriction)
 * - DEPARTMENT_HEAD: their managed department only
 * - EMPLOYEE: none
 */
export function getAccessibleDepartments(
  user: UserForPermissions
): string[] | "ALL" {
  if (user.role === "ADMIN" || user.role === "HR") return "ALL";
  if (user.role === "DEPARTMENT_HEAD" && user.managedDepartment) {
    return [user.managedDepartment];
  }
  return [];
}

/**
 * Get the allowed target types for request creation based on role.
 */
export function getAllowedTargetTypes(
  user: UserForPermissions
): ("ALL_EMPLOYEES" | "DEPARTMENT" | "SPECIFIC")[] {
  if (user.role === "ADMIN" || user.role === "HR") {
    return ["ALL_EMPLOYEES", "DEPARTMENT", "SPECIFIC"];
  }
  if (user.role === "DEPARTMENT_HEAD") {
    return ["DEPARTMENT", "SPECIFIC"];
  }
  return [];
}

/**
 * Check if user has management-level access (ADMIN, HR, or DEPARTMENT_HEAD).
 */
export function isManager(user: UserForPermissions): boolean {
  return ["ADMIN", "HR", "DEPARTMENT_HEAD"].includes(user.role);
}

/**
 * Get the redirect path for a user based on their role.
 */
export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/users";
    case "HR":
      return "/hr/dashboard";
    case "DEPARTMENT_HEAD":
      return "/dept-head/dashboard";
    case "EMPLOYEE":
      return "/employee/dashboard";
    default:
      return "/employee/dashboard";
  }
}
