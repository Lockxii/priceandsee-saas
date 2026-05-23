export const PLAN_LIMITS = {
  FREE: { maxUrls: 10, checkIntervalHours: 24, monthlyCheckLimit: 300, emailAlertsEnabled: true, slackAlertsEnabled: false },
  STARTER: { maxUrls: 10, checkIntervalHours: 24, monthlyCheckLimit: 600, emailAlertsEnabled: true, slackAlertsEnabled: false },
  GROWTH: { maxUrls: 100, checkIntervalHours: 4, monthlyCheckLimit: 6000, emailAlertsEnabled: true, slackAlertsEnabled: true },
  SCALE: { maxUrls: 500, checkIntervalHours: 1, monthlyCheckLimit: 25000, emailAlertsEnabled: true, slackAlertsEnabled: true },
  ENTERPRISE: { maxUrls: 5000, checkIntervalHours: 1, monthlyCheckLimit: 250000, emailAlertsEnabled: true, slackAlertsEnabled: true },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan?: string | null) {
  return PLAN_LIMITS[(plan || "FREE") as PlanName] || PLAN_LIMITS.FREE;
}

export function effectiveUserLimits(user: {
  plan?: string | null;
  maxUrls?: number | null;
  checkIntervalHours?: number | null;
  monthlyCheckLimit?: number | null;
  emailAlertsEnabled?: boolean | null;
  slackAlertsEnabled?: boolean | null;
}) {
  const defaults = getPlanLimits(user.plan);
  return {
    maxUrls: user.maxUrls ?? defaults.maxUrls,
    checkIntervalHours: user.checkIntervalHours ?? defaults.checkIntervalHours,
    monthlyCheckLimit: user.monthlyCheckLimit ?? defaults.monthlyCheckLimit,
    emailAlertsEnabled: user.emailAlertsEnabled ?? defaults.emailAlertsEnabled,
    slackAlertsEnabled: user.slackAlertsEnabled ?? defaults.slackAlertsEnabled,
  };
}

export function nextMonthlyResetDate(from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 0, 0, 0));
}
