import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, email: true }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[#24170f]">Account Settings</h1>

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5b4638] mb-1">Email Address</label>
            <input type="email" disabled value={user?.email || ""} className="w-full px-4 py-2 bg-[#fffaf6] border border-[#f1ded1] rounded-lg text-[#8a7668]" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-4">Billing & Plan</h2>
        <div className="flex items-center justify-between p-4 bg-[#fffaf6] border border-[#f1ded1] rounded-xl mb-6">
          <div>
            <p className="font-semibold text-[#24170f]">Current Plan: <span className="text-[#ff690c]">{user?.plan}</span></p>
            <p className="text-sm text-[#8a7668] mt-1">
              {user?.plan === "FREE" ? "You are on the free starter plan (Max 10 URLs)." : "You are on a premium plan."}
            </p>
          </div>
          <button className="px-4 py-2 bg-[#ff690c] text-white font-medium rounded-lg hover:bg-[#e55e0b] transition-colors">
            {user?.plan === "FREE" ? "Upgrade" : "Manage Billing"}
          </button>
        </div>
      </div>
    </div>
  );
}
