import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  color = "#52525b",
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarFallback
        className="text-white text-xs font-semibold"
        style={{ backgroundColor: color }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
