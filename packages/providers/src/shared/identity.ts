export function toAccountKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function normalizeDomain(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function pickRoleFromTitle(title: string | undefined) {
  const normalized = title?.toLowerCase() ?? "";

  if (normalized.includes("chief") || normalized.includes("vp") || normalized.includes("head")) {
    return "decision_maker" as const;
  }

  if (normalized.includes("revenue operations") || normalized.includes("revops")) {
    return "champion" as const;
  }

  if (normalized.includes("director") || normalized.includes("manager")) {
    return "influencer" as const;
  }

  return "unknown" as const;
}

export function extractEmailAddress(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
  return match?.[1]?.toLowerCase();
}

export function extractDisplayName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const email = extractEmailAddress(value);
  const trimmed = value.replace(/<.*?>/, "").replace(/"/g, "").trim();
  if (!trimmed || trimmed === email) {
    return undefined;
  }

  return trimmed;
}
