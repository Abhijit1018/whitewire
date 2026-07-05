import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { MarketplaceGrid } from "@/components/marketplace/marketplace-grid";

export const metadata = { title: "Marketplace · WhiteWire" };

export default function MarketplacePage() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Marketplace" }]} />
        <main className="flex-1 p-4 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Plugin marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Extend the canvas with templates, frameworks, and diagram generators. Install one,
              then run it from the <span className="font-medium text-foreground">Plugins</span> menu
              on any board.
            </p>
          </div>
          <MarketplaceGrid />
        </main>
      </div>
    </div>
  );
}
