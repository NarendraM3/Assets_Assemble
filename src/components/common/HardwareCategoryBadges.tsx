import { Badge } from "@/components/ui/badge";
import { parseHardwareCategories } from "@/lib/utils";

interface HardwareCategoryBadgesProps {
  value: string | string[] | undefined | null;
  fallback?: string;
}

export function HardwareCategoryBadges({ value, fallback }: HardwareCategoryBadgesProps) {
  const categories = parseHardwareCategories(value);

  if (categories.length === 0) {
    return <span className="font-semibold text-primary">{fallback || "Laptop"}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => (
        <span
          key={cat}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary"
        >
          {cat}
        </span>
      ))}
    </div>
  );
}
