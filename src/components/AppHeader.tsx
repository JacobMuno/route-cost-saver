import { Link } from "@tanstack/react-router";
import { Fuel, Settings as SettingsIcon, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-hero shadow-glow flex items-center justify-center overflow-hidden">
            <Fuel className="h-4 w-4 text-primary-foreground" />
            <Zap className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-primary-foreground/90" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight leading-none text-foreground">
              TripCost
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
              Sweden · Fuel & Charging
            </p>
          </div>
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
