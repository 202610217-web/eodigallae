import { Camera, Coffee, Landmark, ShoppingBag, Ticket, Trees, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/client/cn";
import { tasteLabel, type TasteKey } from "@/lib/domain/constants";

export const TASTE_ICON: Record<TasteKey, LucideIcon> = {
  food: UtensilsCrossed,
  rest: Coffee,
  photo: Camera,
  experience: Ticket,
  nature: Trees,
  culture: Landmark,
  shopping: ShoppingBag,
};

export function TasteChip({
  taste,
  rank,
  className,
  style,
}: {
  taste: TasteKey;
  rank?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = TASTE_ICON[taste];
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[13px] font-medium text-ink",
        className,
      )}
    >
      {rank !== undefined && <span className="font-bold text-coral-strong">{rank}</span>}
      <Icon className="size-3.5 text-ink-soft" aria-hidden />
      {tasteLabel(taste)}
    </span>
  );
}

export function TasteTags({ tags, className }: { tags: TasteKey[]; className?: string }) {
  if (tags.length === 0) return <span className="text-[13px] text-ink-faint">태그 없음</span>;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((t) => (
        <TasteChip key={t} taste={t} />
      ))}
    </div>
  );
}
