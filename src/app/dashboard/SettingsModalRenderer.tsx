"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AlertSettingsClient } from "./AlertSettingsClient";

export function SettingsModalRenderer({ user, updateProfileAction }: { user: any, updateProfileAction: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = searchParams.get("settings") === "true";

  if (!isOpen) return null;

  const closeModal = () => {
    router.push(pathname);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm pt-4 sm:pt-8 px-2 sm:px-6">
      <div className="bg-[#fffaf6] w-full sm:w-[98vw] max-w-[1600px] h-[96vh] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
        <div className="px-8 py-5 border-b border-[#f1ded1] flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-[#24170f]">Account Settings</h2>
          <button onClick={closeModal} className="text-[#8a7668] hover:text-[#24170f] transition-colors p-2 bg-[#fffaf6] rounded-full border border-[#f1ded1]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 overflow-auto flex-1 bg-[#fffaf6]">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-[#f1ded1] shadow-sm">
              <h3 className="text-lg font-semibold text-[#24170f] mb-4">Profile</h3>
              <form action={updateProfileAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5b4638] mb-1">Full Name</label>
                  <input type="text" name="name" defaultValue={user?.name || ""} placeholder="John Doe" className="w-full px-4 py-2 bg-white border border-[#f1ded1] rounded-lg text-[#24170f] focus:outline-none focus:ring-2 focus:ring-[#ff690c]/20 focus:border-[#ff690c] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5b4638] mb-1">Email Address</label>
                  <input type="email" disabled value={user?.email || ""} className="w-full px-4 py-2 bg-[#fffaf6] border border-[#f1ded1] rounded-lg text-[#8a7668] cursor-not-allowed" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="px-5 py-2.5 bg-[#24170f] text-white font-medium rounded-lg hover:bg-[#35251c] transition-colors shadow-sm">
                    Save Profile
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#f1ded1] shadow-sm">
              <h3 className="text-lg font-semibold text-[#24170f] mb-4">Billing & Plan</h3>
              <div className="flex items-center justify-between p-4 bg-[#fffaf6] border border-[#f1ded1] rounded-xl">
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

            <div className="bg-white rounded-2xl shadow-sm border border-[#f1ded1] overflow-hidden">
              <AlertSettingsClient />
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#f1ded1] shadow-sm">
              <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
              <div className="p-5 border border-red-200 bg-[#fff5f5] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-red-800">Delete Account</p>
                  <p className="text-sm text-red-600 mt-1">
                    Permanently delete your account. This action cannot be undone.
                  </p>
                </div>
                <button className="whitespace-nowrap px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
