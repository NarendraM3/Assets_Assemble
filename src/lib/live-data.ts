export function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => (value == null ? "" : String(value)).trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
}

export function monthKey(dateValue?: string | null) {
  if (!dateValue) return "Unknown";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en", { month: "short" });
}

export function countBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = getKey(item);
    const key = raw == null ? "" : String(raw).trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
