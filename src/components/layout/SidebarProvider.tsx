"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarContextValue {
  /** Viewport is below the `md` breakpoint, where the sidebar is a drawer */
  isMobile: boolean;
  /** Sidebar is expanded on desktop */
  isOpen: boolean;
  /** Drawer is open on mobile */
  isMobileOpen: boolean;
  /** Sidebar is contracted to an icon-only rail (desktop only) */
  isRail: boolean;
  /** Opens/closes whichever of the two applies to the current viewport */
  toggle: () => void;
  /** Switches between the icon rail and the full sidebar */
  toggleRail: () => void;
  /** Closes the mobile drawer (no-op on desktop) */
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRail, setIsRail] = useState(false);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((open) => !open);
    } else {
      setIsOpen((open) => !open);
    }
  }, [isMobile]);

  const toggleRail = useCallback(() => setIsRail((rail) => !rail), []);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const value = useMemo(
    () => ({
      isMobile,
      isOpen,
      isMobileOpen,
      isRail,
      toggle,
      toggleRail,
      closeMobile,
    }),
    [isMobile, isOpen, isMobileOpen, isRail, toggle, toggleRail, closeMobile]
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}
