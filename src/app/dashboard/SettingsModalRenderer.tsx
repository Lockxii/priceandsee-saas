"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useCallback } from "react";
import { AlertSettingsClient } from "./AlertSettingsClient";

export function SettingsModalRenderer({ user, updateProfileAction }: { user: any, updateProfileAction: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = searchParams.get("settings") === "true";

  const closeModal = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" onClick={closeModal} />

      {/* Top Hover Zone */}
      <div 
        className="peer group absolute top-0 inset-x-0 h-16 sm:h-20 z-10 flex items-start pt-4 justify-center cursor-pointer"
        onClick={closeModal}
      >
        <div className="text-white/90 text-sm font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md">
          esc to close
        </div>
      </div>

      {/* Modal */}
      <div 
        className="bg-[#fffaf6] w-[100vw] sm:w-[calc(100vw-32px)] h-[calc(100vh-24px)] sm:h-[calc(100vh-48px)] rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_-10px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-20 animate-in slide-in-from-bottom duration-200 ease-out transition-transform peer-hover:translate-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-[#f1ded1] flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-[#24170f]">Account Settings</h2>
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
