import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footprints, Moon, Save } from "lucide-react";

interface HealthDataEntryProps {
  onSubmit: (steps: number, sleepHours: number) => void;
  submitted?: boolean;
  lastSteps?: number;
  lastSleep?: number;
}

const HealthDataEntry = ({ onSubmit, submitted, lastSteps, lastSleep }: HealthDataEntryProps) => {
  const [steps, setSteps] = useState("");
  const [sleepHours, setSleepHours] = useState("");

  const handleSubmit = () => {
    const s = parseInt(steps) || 0;
    const h = parseFloat(sleepHours) || 0;
    if (s >= 0 && h >= 0) {
      onSubmit(s, h);
    }
  };

  if (submitted) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">Today's Health Data</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center rounded-2xl bg-primary/8 p-4">
              <Footprints className="mb-2 h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">{lastSteps?.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">steps</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-primary/8 p-4">
              <Moon className="mb-2 h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">{lastSleep}</span>
              <span className="text-xs text-muted-foreground">hours slept</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-xl">Health Data</CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Enter data from your smartwatch
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="space-y-2">
          <Label htmlFor="steps" className="flex items-center gap-2 text-sm font-medium">
            <Footprints className="h-4 w-4 text-primary" />
            Steps
          </Label>
          <Input
            id="steps"
            type="number"
            placeholder="e.g. 8500"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sleep" className="flex items-center gap-2 text-sm font-medium">
            <Moon className="h-4 w-4 text-primary" />
            Hours of Sleep
          </Label>
          <Input
            id="sleep"
            type="number"
            step="0.5"
            placeholder="e.g. 7.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
        </div>
        <Button
          variant="hero"
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={!steps && !sleepHours}
        >
          <Save className="h-5 w-5" />
          Save Health Data
        </Button>
      </CardContent>
    </Card>
  );
};

export default HealthDataEntry;
