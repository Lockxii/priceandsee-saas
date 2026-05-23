"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";

export function AlertSettingsClient() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-4">Notifications & Alerts</h2>
        <div className="flex items-center justify-between p-5 bg-[#fffaf6] border border-[#f1ded1] rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#ff690c]/10 flex items-center justify-center text-[#ff690c]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[#24170f]">Price Alerts</p>
              <p className="text-sm text-[#8a7668] mt-0.5">Manage how you receive price drop notifications.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(true)}
            className="px-5 py-2.5 bg-white border border-[#e5d5c5] text-[#24170f] font-medium rounded-lg hover:bg-[#fffaf6] transition-colors shadow-sm whitespace-nowrap"
          >
            Configure Alerts
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#f1ded1] flex justify-between items-center bg-[#fffaf6]">
              <h3 className="font-semibold text-lg text-[#24170f]">Alert Preferences</h3>
              <button onClick={() => setIsOpen(false)} className="text-[#8a7668] hover:text-[#24170f] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#24170f]">Email Alerts</p>
                  <p className="text-sm text-[#8a7668]">Receive emails for price changes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff690c]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#24170f]">Weekly Digest</p>
                  <p className="text-sm text-[#8a7668]">Weekly summary of all tracked items</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff690c]"></div>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#f1ded1] bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 font-medium text-[#5b4638] hover:text-[#24170f]">Cancel</button>
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 bg-[#ff690c] text-white font-medium rounded-lg hover:bg-[#e55e0b]">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
