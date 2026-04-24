import { Link } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="Costra — home">
          <img
            src={logoLight}
            alt="Costra"
            width={1272}
            height={258}
            className="h-7 w-auto object-contain shrink-0 block dark:hidden"
          />
          <img
            src={logoDark}
            alt="Costra"
            width={1362}
            height={313}
            className="h-7 w-auto object-contain shrink-0 hidden dark:block"
          />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "text-foreground bg-surface shadow-card",
            }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-all"
          >
            Calculator
          </Link>
          <Link
            to="/settings"
            activeProps={{
              className: "text-foreground bg-surface shadow-card",
            }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
}
