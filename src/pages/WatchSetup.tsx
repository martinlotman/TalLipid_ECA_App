import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Smartphone, Watch } from "lucide-react";

type Platform = "android" | "ios";

const androidSteps = [
  {
    title: "Install Mi Fitness",
    description: 'Download "Mi Fitness" (Zepp Life) from the Google Play Store and sign in with your Xiaomi account.',
    icon: "📲",
  },
  {
    title: "Pair your watch",
    description: "Open Mi Fitness → tap the + icon → select your watch model → follow the Bluetooth pairing steps.",
    icon: "⌚",
  },
  {
    title: "Enable Health Connect sync",
    description: 'In Mi Fitness, go to Profile → Settings → "Data sharing" → enable "Health Connect" for steps, sleep, and heart rate.',
    icon: "🔗",
  },
  {
    title: "Install Health Connect",
    description: 'If prompted, install "Health Connect by Google" from the Play Store. It may already be built into your phone settings.',
    icon: "💚",
  },
  {
    title: "Grant permissions",
    description: "Open Health Connect → Apps → Mi Fitness → allow read access for Steps, Sleep, and Heart Rate.",
    icon: "✅",
  },
  {
    title: "You're all set!",
    description: "TalLipid will now read your health data from Health Connect. Wear your watch daily for the best tracking.",
    icon: "🎉",
  },
];

const iosSteps = [
  {
    title: "Install Mi Fitness",
    description: 'Download "Mi Fitness" from the App Store and sign in with your Xiaomi account.',
    icon: "📲",
  },
  {
    title: "Pair your watch",
    description: "Open Mi Fitness → tap the + icon → select your watch model → follow the Bluetooth pairing steps.",
    icon: "⌚",
  },
  {
    title: "Enable Apple Health sync",
    description: 'In Mi Fitness, go to Profile → Settings → "Apple Health" → turn on sync for steps, sleep, and heart rate.',
    icon: "🔗",
  },
  {
    title: "Grant permissions",
    description: 'When prompted, allow Mi Fitness to write data to Apple Health. Then open Settings → Health → Data Access → Mi Fitness and confirm all categories are enabled.',
    icon: "🍎",
  },
  {
    title: "You're all set!",
    description: "TalLipid will now read your health data from Apple Health. Wear your watch daily for the best tracking.",
    icon: "🎉",
  },
];

const WatchSetup = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else setPlatform("android");
  }, []);

  const steps = platform === "ios" ? iosSteps : androidSteps;
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Watch Setup</h1>
          </div>
          <Watch className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        {/* Platform toggle */}
        <div className="mb-6 flex gap-2 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => { setPlatform("android"); setCurrentStep(0); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              platform === "android"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Smartphone className="mr-1.5 inline h-4 w-4" />
            Android
          </button>
          <button
            onClick={() => { setPlatform("ios"); setCurrentStep(0); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              platform === "ios"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            🍎 iOS
          </button>
        </div>

        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-primary"
                  : i < currentStep
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step card */}
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center gap-5 p-6 text-center">
            <span className="text-5xl">{step.icon}</span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{step.title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/70">{step.description}</p>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
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
              <>
                <Check className="h-4 w-4" /> Done
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default WatchSetup;
