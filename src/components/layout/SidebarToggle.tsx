"use client";

import { PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/SidebarProvider";

export function SidebarToggle() {
  const { isMobile, isOpen, isMobileOpen, toggle } = useSidebar();
  const expanded = isMobile ? isMobileOpen : isOpen;

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      aria-label={expanded ? "Close sidebar" : "Open sidebar"}
      className="rounded-xl text-muted-foreground"
    >
      <PanelLeft className="size-5" />
    </Button>
  );
}
