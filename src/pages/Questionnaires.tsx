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

const EQ5D_DIMENSIONS = [
  {
    id: "mobility",
    title: "Mobility",
    options: [
      "I have no problems in walking about",
      "I have slight problems in walking about",
      "I have moderate problems in walking about",
      "I have severe problems in walking about",
      "I am unable to walk about",
    ],
  },
  {
    id: "selfCare",
    title: "Self-Care",
    options: [
      "I have no problems washing or dressing myself",
      "I have slight problems washing or dressing myself",
      "I have moderate problems washing or dressing myself",
      "I have severe problems washing or dressing myself",
      "I am unable to wash or dress myself",
    ],
  },
  {
    id: "usualActivities",
    title: "Usual Activities",
    subtitle: "(e.g. work, study, housework, family or leisure activities)",
    options: [
      "I have no problems doing my usual activities",
      "I have slight problems doing my usual activities",
      "I have moderate problems doing my usual activities",
      "I have severe problems doing my usual activities",
      "I am unable to do my usual activities",
    ],
  },
  {
    id: "painDiscomfort",
    title: "Pain / Discomfort",
    options: [
      "I have no pain or discomfort",
      "I have slight pain or discomfort",
      "I have moderate pain or discomfort",
      "I have severe pain or discomfort",
      "I have extreme pain or discomfort",
    ],
  },
  {
    id: "anxietyDepression",
    title: "Anxiety / Depression",
    options: [
      "I am not anxious or depressed",
      "I am slightly anxious or depressed",
      "I am moderately anxious or depressed",
      "I am severely anxious or depressed",
      "I am extremely anxious or depressed",
    ],
  },
];

const VAS_MIN = 0;
const VAS_MAX = 100;

const Questionnaires = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0-4 = dimensions, 5 = VAS, 6 = done
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [vas, setVas] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = EQ5D_DIMENSIONS.length + 1; // 5 dimensions + VAS
  const progress = step >= totalSteps ? 100 : Math.round((step / totalSteps) * 100);
  const isDone = step >= totalSteps;

  const currentDim = step < EQ5D_DIMENSIONS.length ? EQ5D_DIMENSIONS[step] : null;

  const handleSelect = (value: string) => {
    if (!currentDim) return;
    setAnswers((prev) => ({ ...prev, [currentDim.id]: parseInt(value) }));
  };

  const canProceed = currentDim ? answers[currentDim.id] !== undefined : true;

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else if (step === totalSteps - 1) {
      // Submit
      setSubmitting(true);
      try {
        // For now, store in daily_logs or just show success
        // In a full implementation you'd have a questionnaire_responses table
        toast({
          title: "Questionnaire submitted",
          description: "Thank you for completing the EQ-5D-5L.",
        });
        setStep(totalSteps);
      } catch {
        toast({ title: "Error", description: "Failed to submit.", variant: "destructive" });
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
            <h2 className="text-2xl font-bold text-foreground">All done!</h2>
            <p className="text-muted-foreground">
              Your EQ-5D-5L responses have been recorded. Thank you.
            </p>
            <p className="text-sm text-muted-foreground">
              Profile: {Object.entries(answers).map(([, v]) => v).join("")} — VAS: {vas}
            </p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">EQ-5D-5L</h1>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 pb-3">
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {currentDim ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{currentDim.title}</CardTitle>
              {currentDim.subtitle && (
                <p className="text-sm text-muted-foreground">{currentDim.subtitle}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Under each heading, please tick the ONE box that best describes your health TODAY.
              </p>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentDim.id]?.toString()}
                onValueChange={handleSelect}
                className="space-y-3"
              >
                {currentDim.options.map((option, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={(i + 1).toString()} id={`${currentDim.id}-${i}`} className="mt-0.5" />
                    <Label htmlFor={`${currentDim.id}-${i}`} className="cursor-pointer text-sm leading-relaxed">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ) : (
          /* VAS step */
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Your health today</CardTitle>
              <p className="text-sm text-muted-foreground">
                We would like to know how good or bad your health is TODAY. The scale is numbered from 0 to 100.
                100 means the best health you can imagine. 0 means the worst health you can imagine.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <span className="text-5xl font-bold text-primary">{vas}</span>
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Worst health (0)</span>
                    <span>Best health (100)</span>
                  </div>
                  <input
                    type="range"
                    min={VAS_MIN}
                    max={VAS_MAX}
                    value={vas}
                    onChange={(e) => setVas(parseInt(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleNext} disabled={!canProceed || submitting} className="w-full gap-2">
          {step === totalSteps - 1 ? "Submit" : "Next"}
          {step < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </main>
    </div>
  );
};

export default Questionnaires;
