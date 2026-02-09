import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const role = session.user.role;

  if (role === "ADMIN" || role === "HR") {
    redirect("/hr/dashboard");
  } else {
    redirect("/employee/dashboard");
  }
}
