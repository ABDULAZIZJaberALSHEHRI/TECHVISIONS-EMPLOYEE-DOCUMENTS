/**
 * Returns a human-friendly display string for a user's role.
 * For DEPARTMENT_HEAD users with department/jobTitle set, shows "Department Title" instead of "DEPARTMENT_HEAD".
 */
export function getRoleDisplay(user: {
  role: string;
  department?: string | null;
  jobTitle?: string | null;
}): string {
  if (user.role === "DEPARTMENT_HEAD") {
    const dept = user.department?.trim();
    const title = user.jobTitle?.trim();

    if (dept && title) return `${dept} ${title}`;
    if (dept) return dept;
    if (title) return title;
  }

  return user.role;
}
