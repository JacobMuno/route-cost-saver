import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const IOS_DISMISSED_KEY = "tripcost.iosInstallDismissed.v1";

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosCard, setShowIosCard] = useState(false);

  useEffect(() => {
    if (inIframe() || isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIos()) {
      const dismissed = localStorage.getItem(IOS_DISMISSED_KEY);
      if (!dismissed) setShowIosCard(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismissIos = () => {
    localStorage.setItem(IOS_DISMISSED_KEY, "1");
    setShowIosCard(false);
  };

  if (!deferred && !showIosCard) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      {deferred && (
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-3 py-2 flex items-center gap-3">
          <Download className="h-4 w-4 text-primary shrink-0" />
          <div className="text-xs text-foreground flex-1">
            Install Fuel Cost for quick access offline.
          </div>
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDeferred(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {showIosCard && !deferred && (
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-3 py-2 flex items-start gap-3">
          <Share className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-foreground flex-1 leading-snug">
            Install on iPhone: tap{" "}
            <Share className="inline h-3 w-3 -mt-0.5" /> Share, then{" "}
            <strong>Add to Home Screen</strong>.
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissIos}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
