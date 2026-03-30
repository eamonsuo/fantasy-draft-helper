import { ModeToggle } from "@/components/mode-toggle";
import { NavLink, Outlet } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors hover:text-foreground ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`;

type LayoutProps = { showHeader?: boolean };

export default function Layout({ showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="h-14 border-b flex items-center">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-sm font-semibold">🏀 Fantasy Draft</span>
              <nav className="flex items-center gap-4">
                <NavLink to="/" end className={navLinkClass}>
                  Draft Board
                </NavLink>
              </nav>
            </div>
            <ModeToggle />
          </div>
        </header>
      )}

      <main className="flex-1 flex">
        <div className="flex-1 mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
