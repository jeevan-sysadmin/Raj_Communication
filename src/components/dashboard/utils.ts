export const formatCurrency = (value: string | number | undefined): string => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

export const parseAppDate = (dateString: string): Date | null => {
  if (!dateString || dateString === "0000-00-00" || dateString === "0000-00-00 00:00:00") {
    return null;
  }

  const trimmed = String(dateString).trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (match) {
    const [, year, month, day, hours = "0", minutes = "0", seconds = "0"] = match;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDisplayDate = (dateString: string): string => {
  const date = parseAppDate(dateString);
  if (!date) return "-";

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDisplayDateTime = (dateString: string): string => {
  const date = parseAppDate(dateString);
  if (!date) return "-";

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatISODate = (dateString: string): string => {
  const date = parseAppDate(dateString);
  if (!date) return "";

  return date.toISOString().split("T")[0];
};

export const getBalanceDue = (
  finalCost: string | number | undefined,
  estimatedCost: string | number | undefined,
  depositAmount: string | number | undefined,
): string => {
  const total = Number(finalCost ?? estimatedCost ?? 0);
  const deposit = Number(depositAmount ?? 0);
  return formatCurrency(total - deposit);
};
