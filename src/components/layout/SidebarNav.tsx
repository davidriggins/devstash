"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/layout/SidebarProvider";
import { RAIL_CENTER, RAIL_HIDDEN } from "@/components/layout/sidebar-styles";
import {
  getItemTypeHref,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TEXT_CLASSES,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { mockCollections, mockItemTypeCounts, mockItemTypes } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const RECENT_COLLECTIONS_LIMIT = 5;

const favoriteCollections = mockCollections.filter(
  (collection) => collection.isFavorite
);

const recentCollections = mockCollections
  .filter((collection) => !collection.isFavorite)
  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  .slice(0, RECENT_COLLECTIONS_LIMIT);

const rowClasses =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

function rowStateClasses(isActive: boolean) {
  return isActive
    ? "bg-sidebar-accent text-sidebar-accent-foreground"
    : "text-sidebar-foreground";
}

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { isRail } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
          RAIL_HIDDEN
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>
      {(isExpanded || isRail) && (
        <div className="mt-1 space-y-0.5">{children}</div>
      )}
    </div>
  );
}

function SidebarSubheading({ children }: { children: ReactNode }) {
  return (
    <p
      className={cn(
        "px-3 pt-3 pb-1 text-xs tracking-wider text-muted-foreground uppercase",
        RAIL_HIDDEN
      )}
    >
      {children}
    </p>
  );
}

function CollectionLink({
  href,
  name,
  leading,
  trailing,
  onNavigate,
  isActive,
}: {
  href: string;
  name: string;
  leading: ReactNode;
  trailing?: ReactNode;
  onNavigate: () => void;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(rowClasses, rowStateClasses(isActive))}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {trailing}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const { isRail, toggleRail, closeMobile } = useSidebar();

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      <div
        className={cn(
          "flex items-center justify-between gap-1.5 px-3 py-1.5",
          RAIL_CENTER
        )}
      >
        <span className={cn("text-sm text-muted-foreground", RAIL_HIDDEN)}>
          Navigation
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleRail}
          aria-label={isRail ? "Expand sidebar" : "Collapse sidebar to icons"}
          title={isRail ? "Expand sidebar" : "Collapse sidebar to icons"}
          className="hidden text-muted-foreground md:inline-flex"
        >
          {isRail ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
      </div>

      <Separator />

      <SidebarGroup label="Types">
        {mockItemTypes.map((itemType) => {
          const name = itemType.name as ItemTypeName;
          const Icon = ITEM_TYPE_ICONS[name];
          const label = ITEM_TYPE_LABELS[name];
          const href = getItemTypeHref(name);
          const isActive = pathname === href;

          return (
            <Link
              key={itemType.id}
              href={href}
              onClick={closeMobile}
              aria-current={isActive ? "page" : undefined}
              title={isRail ? label : undefined}
              className={cn(rowClasses, RAIL_CENTER, rowStateClasses(isActive))}
            >
              <Icon
                className={cn(
                  "size-4 md:group-data-[rail=true]/sidebar:size-5",
                  ITEM_TYPE_TEXT_CLASSES[name]
                )}
              />
              <span className={cn("min-w-0 flex-1 truncate", RAIL_HIDDEN)}>
                {label}
              </span>
              <span className={cn("text-xs text-muted-foreground", RAIL_HIDDEN)}>
                {mockItemTypeCounts[name]}
              </span>
            </Link>
          );
        })}
      </SidebarGroup>

      {/* Folder icons alone say nothing, so collections drop out of the rail */}
      <div className={RAIL_HIDDEN}>
        <Separator />

        <SidebarGroup label="Collections">
          {favoriteCollections.length > 0 && (
            <>
              <SidebarSubheading>Favorites</SidebarSubheading>
              {favoriteCollections.map((collection) => (
                <CollectionLink
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  name={collection.name}
                  isActive={pathname === `/collections/${collection.id}`}
                  onNavigate={closeMobile}
                  leading={
                    <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  }
                />
              ))}
            </>
          )}

          {recentCollections.length > 0 && (
            <>
              <SidebarSubheading>Recent</SidebarSubheading>
              {recentCollections.map((collection) => (
                <CollectionLink
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  name={collection.name}
                  isActive={pathname === `/collections/${collection.id}`}
                  onNavigate={closeMobile}
                  // Spacer keeps the label aligned with the starred favorites above
                  leading={<span aria-hidden className="size-4 shrink-0" />}
                  trailing={
                    <span className="text-xs text-muted-foreground">
                      {collection.itemCount}
                    </span>
                  }
                />
              ))}
            </>
          )}
        </SidebarGroup>
      </div>
    </nav>
  );
}
