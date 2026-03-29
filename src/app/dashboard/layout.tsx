import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/admin";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const admin = await isUserAdmin(session.user.id, session.user.email);

  return (
    <DashboardShell
      userEmail={session.user.email ?? null}
      userName={session.user.name ?? null}
      showAdminLink={admin}
    >
      {children}
    </DashboardShell>
  );
}
