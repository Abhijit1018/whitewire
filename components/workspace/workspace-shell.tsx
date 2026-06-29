export function WorkspaceShell({ projectId, name }: { projectId: string; name: string }) {
  return (
    <div className="flex h-screen flex-col" data-project-id={projectId}>
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">Model: (set up in Settings)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 border-r" aria-label="Tools" />
        <section className="flex-1 bg-muted/30 flex items-center justify-center text-muted-foreground">
          Canvas coming in Phase 2
        </section>
        <aside className="w-72 border-l p-4" aria-label="Inspector">
          <p className="text-sm text-muted-foreground">Inspector</p>
        </aside>
      </div>
      <footer className="h-12 border-t flex items-center px-4 text-sm text-muted-foreground">
        AI command bar — Phase 3
      </footer>
    </div>
  );
}
