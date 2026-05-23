"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, PLAN_LIMITS } from "@/lib/plans";

const ADMIN_EMAIL = "contact.arthur.mouton@gmail.com";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  return session;
}

function intFromForm(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export async function updateUserAdminSettings(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") || "");
  if (!userId) throw new Error("Missing userId");

  const plan = String(formData.get("plan") || "FREE");
  const role = String(formData.get("role") || "USER");
  const defaults = getPlanLimits(plan);

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: role === "ADMIN" ? "ADMIN" : "USER",
      plan: plan in PLAN_LIMITS ? plan : "FREE",
      maxUrls: intFromForm(formData, "maxUrls", defaults.maxUrls),
      checkIntervalHours: Math.max(1, intFromForm(formData, "checkIntervalHours", defaults.checkIntervalHours)),
      monthlyCheckLimit: intFromForm(formData, "monthlyCheckLimit", defaults.monthlyCheckLimit),
      monthlyChecksUsed: intFromForm(formData, "monthlyChecksUsed", 0),
      emailAlertsEnabled: formData.get("emailAlertsEnabled") === "on",
      slackAlertsEnabled: formData.get("slackAlertsEnabled") === "on",
      onboardingCompleted: formData.get("onboardingCompleted") === "on",
      adminNotes: String(formData.get("adminNotes") || "").slice(0, 1000),
    },
  });

  revalidatePath("/admin");
}

export async function resetUserMonthlyChecks(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (!userId) throw new Error("Missing userId");

  await prisma.user.update({
    where: { id: userId },
    data: { monthlyChecksUsed: 0, monthlyChecksReset: new Date() },
  });

  revalidatePath("/admin");
}
