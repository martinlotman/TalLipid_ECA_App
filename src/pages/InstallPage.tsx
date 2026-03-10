import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Download, Smartphone, Apple, Chrome, Share, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

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
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-6">
      {/* Back button */}
      <div className="w-full max-w-md">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* App icon & title */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/pwa-icon-512.png"
            alt="TalLipid"
            className="h-24 w-24 rounded-2xl shadow-lg"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Install TalLipid</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <p className="text-center font-medium text-foreground">
                TalLipid is already installed!
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Open it from your home screen for the full app experience.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Direct install button (Android/Desktop when browser supports it) */}
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

            {/* iOS instructions — always shown on iOS */}
            {platform === "ios" && (
              <Card className="border-primary/20">
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Apple className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Install on iPhone / iPad</h2>
                      <p className="text-xs text-muted-foreground">Using Safari only</p>
                    </div>
                  </div>

                  <ol className="space-y-4 text-sm text-foreground/80">
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </span>
                      <span className="pt-0.5">
                        Tap the <strong>Share</strong> button{" "}
                        <Share className="inline h-4 w-4 text-primary" /> at the bottom of the screen
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </span>
                      <span className="pt-0.5">
                        Scroll down and tap <strong>"Add to Home Screen"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </span>
                      <span className="pt-0.5">
                        Tap <strong>"Add"</strong> in the top-right corner
                      </span>
                    </li>
                  </ol>

                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ You must use <strong>Safari</strong> — Chrome and other browsers on iOS don't support "Add to Home Screen."
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android instructions (fallback when no beforeinstallprompt) */}
            {platform === "android" && !deferredPrompt && (
              <Card className="border-primary/20">
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Install on Android</h2>
                      <p className="text-xs text-muted-foreground">Using Chrome</p>
                    </div>
                  </div>

                  <ol className="space-y-4 text-sm text-foreground/80">
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </span>
                      <span className="pt-0.5">
                        Tap the <strong>three-dot menu</strong>{" "}
                        <MoreVertical className="inline h-4 w-4 text-primary" /> in Chrome
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </span>
                      <span className="pt-0.5">
                        Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </span>
                      <span className="pt-0.5">
                        Tap <strong>"Install"</strong> to confirm
                      </span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Desktop fallback */}
            {platform === "desktop" && !deferredPrompt && (
              <>
                {/* Show both iOS and Android instructions on desktop for reference */}
                <Card className="border-primary/20">
                  <CardContent className="space-y-5 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Chrome className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">Install on Desktop</h2>
                        <p className="text-xs text-muted-foreground">Chrome or Edge</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80">
                      Look for the <strong>install icon</strong> (⊕) in your browser's address bar and click it, or use the browser menu → "Install TalLipid."
                    </p>
                  </CardContent>
                </Card>

                <div className="relative flex items-center gap-4 py-2">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">or install on mobile</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Apple className="h-5 w-5 text-foreground" />
                      <h3 className="font-semibold text-foreground">iPhone / iPad</h3>
                    </div>
                    <p className="text-sm text-foreground/80">
                      Open this page in <strong>Safari</strong> → tap <Share className="inline h-4 w-4" /> → <strong>"Add to Home Screen"</strong>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-foreground" />
                      <h3 className="font-semibold text-foreground">Android</h3>
                    </div>
                    <p className="text-sm text-foreground/80">
                      Open this page in <strong>Chrome</strong> → tap <MoreVertical className="inline h-4 w-4" /> → <strong>"Install app"</strong>
                    </p>
                  </CardContent>
                </Card>
              </>
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
