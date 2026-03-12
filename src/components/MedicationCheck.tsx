import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Pill } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

interface MedicationCheckProps {
  onSubmit: (taken: boolean) => void;
  submitted?: boolean;
  lastAnswer?: boolean;
}

const MedicationCheck = ({ onSubmit, submitted, lastAnswer }: MedicationCheckProps) => {
  const { t } = useTranslation();

  if (submitted) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${lastAnswer ? 'bg-success/15' : 'bg-destructive/15'}`}>
            {lastAnswer ? <Check className="h-8 w-8 text-success" /> : <X className="h-8 w-8 text-destructive" />}
          </div>
          <p className="text-lg font-semibold text-foreground">
            {lastAnswer ? t("med.takenMsg") : t("med.notTakenMsg")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("med.saved")}</p>
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
        <CardTitle className="text-center text-xl">{t("med.title")}</CardTitle>
        <p className="text-center text-sm text-muted-foreground">{t("med.question")}</p>
      </CardHeader>
      <CardContent className="flex gap-3 px-6 pb-6">
        <Button variant="success" className="flex-1 h-14 text-base rounded-2xl gap-2" onClick={() => onSubmit(true)}>
          <Check className="h-5 w-5" /> {t("med.yes")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-14 text-base rounded-2xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onSubmit(false)}
        >
          <X className="h-5 w-5" /> {t("med.no")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MedicationCheck;
