import { Bird, Cat, Crown, Dog, Fish, Rabbit, Snail, Squirrel, Turtle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/client/cn";
import { colorHex, type CharacterKey, type ColorKey } from "@/lib/domain/constants";

export const CHARACTER_ICON: Record<CharacterKey, LucideIcon> = {
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  bird: Bird,
  fish: Fish,
  squirrel: Squirrel,
  turtle: Turtle,
  snail: Snail,
};

const SIZES = {
  sm: "size-8 [&>svg]:size-4",
  md: "size-10 [&>svg]:size-5",
  lg: "size-14 [&>svg]:size-7",
};

export function Avatar({
  character,
  color,
  size = "md",
  crown,
  className,
  label,
}: {
  character: CharacterKey;
  color: ColorKey;
  size?: keyof typeof SIZES;
  crown?: boolean;
  className?: string;
  label?: string;
}) {
  const Icon = CHARACTER_ICON[character] ?? Cat;
  const hex = colorHex(color);
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("flex items-center justify-center rounded-full border-2 border-white", SIZES[size])}
        style={{ backgroundColor: `${hex}26`, color: hex }}
      >
        <Icon strokeWidth={2.2} />
      </span>
      {crown && (
        <Crown
          className="absolute -top-3 left-1/2 size-5 -translate-x-1/2 animate-crown fill-[#FFC93C] text-[#B7860B]"
          aria-label="결정권자"
        />
      )}
    </span>
  );
}
