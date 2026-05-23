import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, email: true, name: true, createdAt: true }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[#24170f]">Account Settings</h1>

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5b4638] mb-1">Full Name</label>
            <input type="text" disabled value={user?.name || ""} className="w-full px-4 py-2 bg-[#fffaf6] border border-[#f1ded1] rounded-lg text-[#8a7668]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5b4638] mb-1">Email Address</label>
            <input type="email" disabled value={user?.email || ""} className="w-full px-4 py-2 bg-[#fffaf6] border border-[#f1ded1] rounded-lg text-[#8a7668]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5b4638] mb-1">Member Since</label>
            <input type="text" disabled value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ""} className="w-full px-4 py-2 bg-[#fffaf6] border border-[#f1ded1] rounded-lg text-[#8a7668]" />
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

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#fffaf6] border border-[#f1ded1] rounded-xl">
            <div>
              <p className="font-medium text-[#24170f]">Email Alerts</p>
              <p className="text-sm text-[#8a7668] mt-0.5">Receive an email when a tracked price changes.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff690c]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#fffaf6] border border-[#f1ded1] rounded-xl">
            <div>
              <p className="font-medium text-[#24170f]">Weekly Digest</p>
              <p className="text-sm text-[#8a7668] mt-0.5">Receive a weekly summary of your tracked URLs.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff690c]"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
          <p className="font-medium text-red-800">Delete Account</p>
          <p className="text-sm text-red-600 mt-1 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
