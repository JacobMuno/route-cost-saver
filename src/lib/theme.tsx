import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeCtx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "tripcost.theme.v1";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const m = readStoredMode();
    setModeState(m);
  }, []);

  // Apply + react to system changes.
  useEffect(() => {
    const compute = (): "light" | "dark" =>
      mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

    const next = compute();
    setResolved(next);
    applyTheme(next);

    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = systemPrefersDark() ? "dark" : "light";
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, m);
    }
    setModeState(m);
  }, []);

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}

/**
 * Inline pre-hydration script. Keeps the page from flashing the wrong theme
 * before React mounts. Inject as a <script> with `dangerouslySetInnerHTML`.
 */
export const themeBootstrapScript = `
(function(){try{
  var k='${STORAGE_KEY}';
  var s=localStorage.getItem(k);
  var m=(s==='light'||s==='dark'||s==='system')?s:'system';
  var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var r=m==='system'?(d?'dark':'light'):m;
  var c=document.documentElement;
  if(r==='dark')c.classList.add('dark');else c.classList.remove('dark');
  c.style.colorScheme=r;
}catch(e){}})();
`;
