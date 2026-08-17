"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, User } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { RAIL_CENTER, RAIL_HIDDEN } from "@/components/layout/sidebar-styles";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SidebarUserProfile } from "@/types/dashboard";

interface SidebarUserProps {
  user: SidebarUserProfile | null;
}

export function SidebarUser({ user }: SidebarUserProps) {
  // The proxy guards every route this sidebar renders under, so an absent
  // session means something is wrong rather than a signed-out visitor
  if (!user) {
    return null;
  }

  const name = user.name ?? user.email ?? "Account";

  return (
    <div className="shrink-0 border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted/50",
            RAIL_CENTER
          )}
        >
          <UserAvatar
            size="lg"
            name={user.name}
            email={user.email}
            image={user.image}
          />

          <div className={cn("min-w-0 flex-1", RAIL_HIDDEN)}>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>

          <ChevronsUpDown
            className={cn("size-4 shrink-0 text-muted-foreground", RAIL_HIDDEN)}
          />
        </DropdownMenuTrigger>

        {/* Opens upward: this row sits at the bottom of the sidebar */}
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <DropdownMenuItem render={<Link href="/profile" />}>
            <User />
            Profile
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => signOutAction()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
