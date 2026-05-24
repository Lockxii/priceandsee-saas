import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GuidedTour } from "./GuidedTour";
import { AccountMenu } from "./AccountMenu";
import { SettingsModalRenderer } from "./SettingsModalRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMobileNav } from "./DashboardMobileNav";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, role: true, plan: true, name: true, email: true, createdAt: true },
  });

  async function updateProfileAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session) return;
    const name = formData.get("name") as string;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });
    revalidatePath("/");
  }

  const accountMenu = (
    <AccountMenu
      email={user?.email || session.user.email || "user@priceandsee.com"}
      name={user?.name || session.user.name}
      role={user?.role}
      plan={user?.plan}
    />
  );

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dash-bg)] flex text-[var(--dash-ink)]">
      <DashboardSidebar footer={accountMenu} />

      <main className="flex-1 flex flex-col min-w-0">
        <DashboardHeader plan={user?.plan} />
        <div className="flex-1 overflow-y-auto pb-28 sm:pb-0">
          <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full">{children}</div>
        </div>
        <div className="shrink-0 border-t border-[var(--dash-border)] bg-white p-3 sm:hidden">{accountMenu}</div>
        <DashboardMobileNav />
      </main>

      <GuidedTour show={!user?.onboardingCompleted} />
      <Suspense fallback={null}>
        <SettingsModalRenderer user={user} updateProfileAction={updateProfileAction} />
      </Suspense>
    </div>
  );
}
