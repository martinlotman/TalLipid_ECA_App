import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";

const DIMENSION_IDS = ["mobility", "selfCare", "usualActivities", "painDiscomfort", "anxietyDepression"];

const VAS_MIN = 0;
const VAS_MAX = 100;

const Questionnaires = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [vas, setVas] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = DIMENSION_IDS.length + 1;
  const progress = step >= totalSteps ? 100 : Math.round((step / totalSteps) * 100);
  const isDone = step >= totalSteps;

  const currentDimId = step < DIMENSION_IDS.length ? DIMENSION_IDS[step] : null;

  const getDimTitle = (id: string) => t(`quest.${id}`);
  const getDimSubtitle = (id: string) => {
    const key = `quest.${id}Sub`;
    const val = t(key);
    return val !== key ? val : undefined;
  };
  const getDimOptions = (id: string) =>
    [1, 2, 3, 4, 5].map((i) => t(`quest.${id}.${i}`));

  const handleSelect = (value: string) => {
    if (!currentDimId) return;
    setAnswers((prev) => ({ ...prev, [currentDimId]: parseInt(value) }));
  };

  const canProceed = currentDimId ? answers[currentDimId] !== undefined : true;

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else if (step === totalSteps - 1) {
      setSubmitting(true);
      try {
        toast({
          title: t("quest.submitted"),
          description: t("quest.submittedDesc"),
        });
        setStep(totalSteps);
      } catch {
        toast({ title: t("common.error"), description: t("common.failedSubmit"), variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (isDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="space-y-4 py-10">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t("quest.done")}</h2>
            <p className="text-muted-foreground">{t("quest.doneDesc")}</p>
            <p className="text-sm text-muted-foreground">
              Profile: {Object.entries(answers).map(([, v]) => v).join("")} — VAS: {vas}
            </p>
            <Button onClick={() => navigate("/")} className="mt-4">{t("quest.returnHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stepLabel = t("quest.stepOf").replace("{0}", String(step + 1)).replace("{1}", String(totalSteps));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t("quest.title")}</h1>
            <p className="text-xs text-muted-foreground">{stepLabel}</p>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 pb-3">
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {currentDimId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{getDimTitle(currentDimId)}</CardTitle>
              {getDimSubtitle(currentDimId) && (
                <p className="text-sm text-muted-foreground">{getDimSubtitle(currentDimId)}</p>
              )}
              <p className="text-sm text-muted-foreground">{t("quest.instruction")}</p>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentDimId]?.toString()}
                onValueChange={handleSelect}
                className="space-y-3"
              >
                {getDimOptions(currentDimId).map((option, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={(i + 1).toString()} id={`${currentDimId}-${i}`} className="mt-0.5" />
                    <Label htmlFor={`${currentDimId}-${i}`} className="cursor-pointer text-sm leading-relaxed">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("quest.vasTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("quest.vasDesc")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <span className="text-5xl font-bold text-primary">{vas}</span>
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("quest.vasWorst")}</span>
                    <span>{t("quest.vasBest")}</span>
                  </div>
                  <input
                    type="range" min={VAS_MIN} max={VAS_MAX} value={vas}
                    onChange={(e) => setVas(parseInt(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleNext} disabled={!canProceed || submitting} className="w-full gap-2">
          {step === totalSteps - 1 ? t("quest.submit") : t("quest.next")}
          {step < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </main>
    </div>
  );
};

export default Questionnaires;
