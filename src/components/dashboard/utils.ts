export const formatCurrency = (value: string | number | undefined): string => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

export const formatDisplayDate = (dateString: string): string => {
  if (!dateString || dateString === "0000-00-00 00:00:00") {
    return "-";
  }

  const normalized = dateString.includes(" ") ? dateString.replace(" ", "T") : dateString;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatISODate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

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
