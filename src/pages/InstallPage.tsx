import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, Apple, Chrome, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* App icon & title */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/pwa-icon-512.png"
            alt="TalLipid"
            className="h-24 w-24 rounded-2xl shadow-lg"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">TalLipid</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lipid Medication Monitor
            </p>
          </div>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Download className="h-7 w-7 text-primary" />
              </div>
              <p className="text-center font-medium text-foreground">
                TalLipid is installed!
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Open it from your home screen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Direct install button (Android/Desktop with prompt) */}
            {deferredPrompt && (
              <Button
                size="lg"
                className="w-full gap-2 text-base"
                onClick={handleInstall}
              >
                <Download className="h-5 w-5" />
                Install TalLipid
              </Button>
            )}

            {/* iOS instructions */}
            {platform === "ios" && (
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Apple className="h-6 w-6 text-foreground" />
                    <h2 className="font-semibold text-foreground">Install on iPhone</h2>
                  </div>
                  <ol className="space-y-3 text-sm text-foreground/80">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        1
                      </span>
                      <span>
                        Tap the <strong>Share</strong> button{" "}
                        <Share className="inline h-4 w-4" /> at the bottom of Safari
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        2
                      </span>
                      <span>
                        Scroll down and tap <strong>"Add to Home Screen"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        3
                      </span>
                      <span>
                        Tap <strong>"Add"</strong> in the top right corner
                      </span>
                    </li>
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Must use Safari — other browsers don't support installation on iOS.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Android instructions (fallback if no prompt) */}
            {platform === "android" && !deferredPrompt && (
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-6 w-6 text-foreground" />
                    <h2 className="font-semibold text-foreground">Install on Android</h2>
                  </div>
                  <ol className="space-y-3 text-sm text-foreground/80">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        1
                      </span>
                      <span>
                        Tap the <strong>three-dot menu</strong> (⋮) in Chrome
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        2
                      </span>
                      <span>
                        Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        3
                      </span>
                      <span>
                        Tap <strong>"Install"</strong> to confirm
                      </span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Desktop fallback */}
            {platform === "desktop" && !deferredPrompt && (
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Chrome className="h-6 w-6 text-foreground" />
                    <h2 className="font-semibold text-foreground">Install on Desktop</h2>
                  </div>
                  <p className="text-sm text-foreground/80">
                    Click the install icon in your browser's address bar, or open this page on your
                    phone to install the mobile app.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features summary */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: "💊", text: "Medication tracking" },
            { emoji: "⌚", text: "Watch sync" },
            { emoji: "🤖", text: "AI health assistant" },
            { emoji: "📊", text: "REDCap integration" },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-foreground/80"
            >
              <span className="text-lg">{f.emoji}</span>
              {f.text}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Works offline · No app store needed · Updates automatically
        </p>
      </div>
    </div>
  );
};

export default InstallPage;
