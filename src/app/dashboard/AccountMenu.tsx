"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, CreditCard, LogOut, Shield, Settings } from "lucide-react";

type AccountMenuProps = {
  email: string;
  name?: string | null;
  role?: string;
  plan?: string;
};

function initials(email: string, name?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function firstName(email: string, name?: string | null) {
  return name?.split(" ")[0] || email.split("@")[0];
}

export function AccountMenu({ email, name, role = "USER", plan = "FREE" }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN" || email === "contact.arthur.mouton@gmail.com";
  const displayInitials = initials(email, name);
  const displayName = firstName(email, name);

  const items = [
    { label: "Settings", href: "?settings=true", icon: Settings },
    { label: "Plans", href: "/tarifs", icon: CreditCard },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
  ];

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute bottom-[64px] left-0 right-0 overflow-hidden rounded-[16px] border border-white/10 bg-[#241d19] p-1.5 text-white shadow-[0_18px_55px_-28px_rgba(36,23,15,0.85)]"
          >
            <div className="flex items-center gap-2.5 rounded-[12px] bg-white/5 p-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/14 text-xs font-bold text-white ring-1 ring-white/10">
                {displayInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{name || displayName}</p>
                <p className="truncate text-[11px] text-white/55">{email}</p>
              </div>
            </div>

            <div className="my-1.5 h-px bg-white/8" />

            <div className="space-y-0.5">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-white/82 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <item.icon className="h-3.5 w-3.5 text-white/70" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-white/82 transition-colors hover:bg-white/8 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5 text-white/70" />
                Sign out
              </Link>
            </div>

            <div className="mt-1.5 rounded-[12px] bg-white/6 p-2 ring-1 ring-white/8">
              <div className="flex items-center justify-between text-[11px] text-white/65">
                <span>Current plan</span>
                <span className="font-bold text-[#ffb27c]">{plan}</span>
              </div>
              <Link
                href="/tarifs"
                onClick={() => setOpen(false)}
                className="mt-1.5 flex h-8 items-center justify-center rounded-[10px] bg-white/9 text-[13px] font-bold text-white transition-colors hover:bg-[#ff690c]"
              >
                Upgrade plan
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-[14px] border border-[#f1ded1] bg-white p-2 text-left shadow-[0_12px_34px_-26px_rgba(53,37,28,0.6)] transition-all hover:border-[#ffd7bd] hover:bg-[#fff8f2]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#fff2e8] text-xs font-[800] text-[#ff690c] ring-1 ring-[#ffd7bd]">
          {displayInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#24170f]">Good morning, {displayName}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#6f5a4d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff690c]" />
            <span>{plan === "FREE" ? "Free Plan" : `${plan} Plan`}</span>
          </div>
        </div>
        <ChevronUp className={`h-4 w-4 text-[#8a7668] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
