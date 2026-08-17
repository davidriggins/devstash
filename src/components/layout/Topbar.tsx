import Link from "next/link";
import { FolderPlus, Layers, Plus, Search } from "lucide-react";

import { EnvironmentBadge } from "@/components/layout/EnvironmentBadge";
import { SidebarToggle } from "@/components/layout/SidebarToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-sidebar px-4">
      {/* Toggle leads on mobile; the logo reclaims the far left from `md` up */}
      <SidebarToggle />

      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-3 text-sidebar-foreground md:order-first md:w-60"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
          <Layers className="size-5" />
        </span>
        <span className="hidden text-xl font-semibold tracking-tight sm:inline">
          DevStash
        </span>
      </Link>

      <EnvironmentBadge />

      <div className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          aria-label="Search items"
          readOnly
          className="h-10 rounded-xl pr-16 pl-9"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="lg" className="hidden rounded-xl sm:flex">
          <FolderPlus />
          New Collection
        </Button>
        <Button size="lg" className="rounded-xl">
          <Plus />
          New Item
        </Button>
      </div>
    </header>
  );
}
