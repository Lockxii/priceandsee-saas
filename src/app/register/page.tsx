"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!signInRes?.error) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-[#ff690c] selection:text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Link href="/" className="font-bold text-[22px] text-black tracking-tight flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-[7px] bg-[#ff690c] flex items-center justify-center text-white">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          PriceAndSee
        </Link>
        
        <div className="w-full max-w-[420px] bg-white p-10 rounded-[20px] border border-[#ebebeb] shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff690c]/5 rounded-bl-[100px] -z-0 pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-[26px] font-bold text-black tracking-tight mb-2">Create an account</h1>
            <p className="text-[15px] text-[#474747]">Start tracking competitors today</p>
          </div>
          
          {error && <div className="mb-6 p-4 bg-[#fff8f5] text-[#ff690c] border border-[#ff690c]/20 text-[14px] rounded-[12px] font-medium text-center">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-[14px] font-medium text-black mb-2">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 h-[48px] rounded-[10px] border border-[#ebebeb] bg-[#fafafa] text-black focus:bg-white focus:border-[#ff690c] focus:ring-4 focus:ring-[#ff690c]/10 outline-none transition-all text-[15px]" 
                placeholder="founder@startup.com"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-black mb-2">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 h-[48px] rounded-[10px] border border-[#ebebeb] bg-[#fafafa] text-black focus:bg-white focus:border-[#ff690c] focus:ring-4 focus:ring-[#ff690c]/10 outline-none transition-all text-[15px]" 
                placeholder="••••••••"
              />
            </div>
            <button disabled={loading} type="submit" className="w-full h-[48px] mt-2 bg-[#ff690c] text-white rounded-[10px] font-medium text-[15px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_0_rgb(255,105,12,0.39)] disabled:opacity-50">
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>
          <div className="mt-8 text-center text-[14px] text-[#474747] relative z-10">
            Already have an account? <Link href="/login" className="text-black font-semibold hover:text-[#ff690c] transition-colors">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
