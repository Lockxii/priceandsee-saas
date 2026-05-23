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
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" disabled value={user?.email || ""} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing & Plan</h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
          <div>
            <p className="font-semibold text-slate-900">Current Plan: <span className="text-indigo-600">{user?.plan}</span></p>
            <p className="text-sm text-slate-500 mt-1">
              {user?.plan === "FREE" ? "You are on the free starter plan (Max 10 URLs)." : "You are on a premium plan."}
            </p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            {user?.plan === "FREE" ? "Upgrade" : "Manage Billing"}
          </button>
        </div>
      </div>
    </div>
  );
}
