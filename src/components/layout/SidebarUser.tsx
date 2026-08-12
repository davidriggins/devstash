import { Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RAIL_CENTER, RAIL_HIDDEN } from "@/components/layout/sidebar-styles";
import { mockUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SidebarUser() {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 border-t border-border p-3",
        RAIL_CENTER
      )}
    >
      <Avatar size="lg" title={mockUser.name}>
        <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
      </Avatar>

      <div className={cn("min-w-0 flex-1", RAIL_HIDDEN)}>
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {mockUser.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {mockUser.email}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Settings"
        className={cn("text-muted-foreground", RAIL_HIDDEN)}
      >
        <Settings />
      </Button>
    </div>
  );
}
