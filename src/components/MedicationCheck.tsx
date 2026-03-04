import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Pill } from "lucide-react";

interface MedicationCheckProps {
  onSubmit: (taken: boolean) => void;
  submitted?: boolean;
  lastAnswer?: boolean;
}

const MedicationCheck = ({ onSubmit, submitted, lastAnswer }: MedicationCheckProps) => {
  if (submitted) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${lastAnswer ? 'bg-success/15' : 'bg-destructive/15'}`}>
            {lastAnswer ? (
              <Check className="h-8 w-8 text-success" />
            ) : (
              <X className="h-8 w-8 text-destructive" />
            )}
          </div>
          <p className="text-lg font-semibold text-foreground">
            {lastAnswer ? "Great job! Keep it up!" : "Recorded. Please try to take them."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Response saved for today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Pill className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-center text-xl">Daily Medication Check</CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Have you taken all of your medications today?
        </p>
      </CardHeader>
      <CardContent className="flex gap-3 px-6 pb-6">
        <Button
          variant="success"
          className="flex-1 h-14 text-base rounded-2xl gap-2"
          onClick={() => onSubmit(true)}
        >
          <Check className="h-5 w-5" />
          Yes
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-14 text-base rounded-2xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onSubmit(false)}
        >
          <X className="h-5 w-5" />
          No
        </Button>
      </CardContent>
    </Card>
  );
};

export default MedicationCheck;
