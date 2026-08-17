import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarProvider";
import { Topbar } from "@/components/layout/Topbar";
import { getSidebarCollections } from "@/lib/db/collections";
import { getItemTypeCounts } from "@/lib/db/items";

// The sidebar reads live database state, so it must not be prerendered
export const dynamic = "force-dynamic";

const RECENT_COLLECTIONS_LIMIT = 5;

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const [itemTypes, collections, session] = await Promise.all([
    getItemTypeCounts(),
    getSidebarCollections(RECENT_COLLECTIONS_LIMIT),
    auth(),
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Topbar />
        <div className="relative flex min-h-0 flex-1">
          <Sidebar
            itemTypes={itemTypes}
            favoriteCollections={collections.favorites}
            recentCollections={collections.recents}
            user={
              session?.user
                ? {
                    name: session.user.name ?? null,
                    email: session.user.email ?? null,
                    image: session.user.image ?? null,
                  }
                : null
            }
          />
          <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
