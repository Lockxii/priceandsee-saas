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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-4xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-4 border-b border-[#f1ded1] flex justify-between items-center bg-[#fffaf6] group cursor-default">
              <h3 className="font-semibold text-lg text-[#24170f]">Alert Destinations</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">esc to close</span>
                <button onClick={() => setIsOpen(false)} className="text-[#8a7668] hover:text-[#24170f] transition-colors p-1 bg-white rounded-full border border-[#f1ded1]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-white to-[#fffaf6]/50">
              <div className="text-center">
                <h4 className="text-xl font-bold text-[#24170f] mb-2">Connect your networks</h4>
                <p className="text-[#8a7668]">Select where you want to receive your price drop alerts.</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
                {[
                  { name: "Email", icon: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Circle-icons-mail.svg" },
                  { name: "Slack", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
                  { name: "Discord", icon: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" },
                  { name: "Telegram", icon: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" }
                ].map((net) => (
                  <label key={net.name} className="flex flex-col items-center gap-3 cursor-pointer group relative">
                    <input type="checkbox" className="sr-only peer" defaultChecked={net.name === "Email"} />
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-2 border-[#f1ded1] shadow-sm flex items-center justify-center peer-checked:border-[#ff690c] peer-checked:bg-[#fffaf6] peer-checked:shadow-[0_0_15px_rgba(255,105,12,0.15)] transition-all group-hover:scale-105">
                      <img src={net.icon} alt={net.name} className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                      
                      {/* Checkmark badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#ff690c] rounded-full text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity shadow-md">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[#5b4638] group-hover:text-[#24170f] peer-checked:text-[#ff690c] peer-checked:font-bold">{net.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[#f1ded1] bg-white flex justify-center sm:justify-end gap-3">
              <button onClick={() => setIsOpen(false)} className="px-6 py-2.5 font-medium text-[#5b4638] hover:text-[#24170f] bg-gray-50 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={() => setIsOpen(false)} className="px-8 py-2.5 bg-[#ff690c] text-white font-medium rounded-lg hover:bg-[#e55e0b] shadow-md">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
