"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { useSidebar } from "@/components/layout/SidebarProvider";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { cn } from "@/lib/utils";
import type { SidebarCollection, SidebarItemType } from "@/types/dashboard";

interface SidebarProps {
  itemTypes: SidebarItemType[];
  favoriteCollections: SidebarCollection[];
  recentCollections: SidebarCollection[];
}

export function Sidebar({
  itemTypes,
  favoriteCollections,
  recentCollections,
}: SidebarProps) {
  const { isMobile, isOpen, isMobileOpen, isRail, closeMobile } = useSidebar();
  const isVisible = isMobile ? isMobileOpen : isOpen;

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeMobile}
          className="absolute inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={cn(
          // Drawer on mobile (sliding in below the top bar, which stays clickable),
          // in-flow column that collapses to zero width on desktop
          "absolute inset-y-0 left-0 z-50 w-64 shrink-0 overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 md:transition-[width]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isOpen ? (isRail ? "md:w-16" : "md:w-64") : "md:w-0 md:border-r-0"
        )}
      >
        <div
          data-rail={isRail ? "true" : "false"}
          inert={!isVisible}
          className={cn(
            "group/sidebar flex h-full w-64 flex-col",
            isRail && "md:w-16"
          )}
        >
          <SidebarNav
            itemTypes={itemTypes}
            favoriteCollections={favoriteCollections}
            recentCollections={recentCollections}
          />
          <SidebarUser />
        </div>
      </aside>
    </>
  );
}
