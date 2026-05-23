"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

type AdminSelectProps = {
  name: string;
  defaultValue: string;
  options: string[];
};

export function AdminSelect({ name, defaultValue, options }: AdminSelectProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between rounded-[10px] border border-[#d7dce3] bg-white px-3 text-left text-sm font-medium text-[#24170f] outline-none transition-colors hover:border-[#ffb27c] focus:border-[#ff690c] focus:ring-2 focus:ring-[#ff690c]/10"
      >
        <span>{value}</span>
        <ChevronDown className={`h-4 w-4 text-[#8a7668] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[44px] z-50 overflow-hidden rounded-[12px] border border-[#e8ded6] bg-white p-1 shadow-[0_18px_50px_-24px_rgba(36,23,15,0.45)]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setValue(option);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-[9px] px-3 py-2 text-sm font-medium transition-colors ${
                value === option ? "bg-[#fff2e8] text-[#ff690c]" : "text-[#5b4638] hover:bg-[#fff8f2] hover:text-[#24170f]"
              }`}
            >
              {option}
              {value === option && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
