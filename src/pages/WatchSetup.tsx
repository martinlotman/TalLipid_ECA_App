import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Smartphone, Watch } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

type Platform = "android" | "ios";

const STEP_ICONS = {
  android: ["📲", "⌚", "🔗", "💚", "✅", "🎉"],
  ios: ["📲", "⌚", "🔗", "🍎", "🎉"],
};

const WatchSetup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else setPlatform("android");
  }, []);

  const p = platform ?? "android";
  const stepCount = STEP_ICONS[p].length;
  const icons = STEP_ICONS[p];
  const isLast = currentStep === stepCount - 1;

  const stepTitle = t(`watchSetup.${p}.step${currentStep + 1}.title`);
  const stepDesc = t(`watchSetup.${p}.step${currentStep + 1}.desc`);
  const stepLabel = t("watchSetup.stepOf").replace("{0}", String(currentStep + 1)).replace("{1}", String(stepCount));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t("watchSetup.title")}</h1>
          </div>
          <Watch className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="mb-6 flex gap-2 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => { setPlatform("android"); setCurrentStep(0); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === "android" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Smartphone className="mr-1.5 inline h-4 w-4" />
            {t("watchSetup.android")}
          </button>
          <button
            onClick={() => { setPlatform("ios"); setCurrentStep(0); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === "ios" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            🍎 {t("watchSetup.ios")}
          </button>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: stepCount }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-2 bg-primary/40" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <Card className="flex-1">
          <CardContent className="flex flex-col items-center gap-5 p-6 text-center">
            <span className="text-5xl">{icons[currentStep]}</span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stepLabel}</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{stepTitle}</h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/70">{stepDesc}</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" className="gap-1" onClick={() => setCurrentStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> {t("watchSetup.back")}
            </Button>
          )}
          <Button
            className="flex-1 gap-1"
            onClick={() => {
              if (isLast) navigate("/");
              else setCurrentStep((s) => s + 1);
            }}
          >
            {isLast ? (
              <><Check className="h-4 w-4" /> {t("watchSetup.done")}</>
            ) : (
              <>{t("watchSetup.next")} <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default WatchSetup;
