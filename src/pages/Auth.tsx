import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Loader2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation, LANGUAGE_LABELS, type Language } from "@/contexts/LanguageContext";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [redcapRecordId, setRedcapRecordId] = useState("");
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("auth.loading")}</div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        // Set language before signup so it's ready
        setLanguage(selectedLang);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, redcap_record_id: redcapRecordId, language: selectedLang },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: t("auth.checkEmail"),
          description: t("auth.checkEmailDesc"),
        });
      }
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {/* Language selector at top */}
          <div className="flex justify-center gap-1 mb-3">
            {(["en", "et", "ru"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setSelectedLang(lang);
                  setLanguage(lang);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  language === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("auth.appName")}</CardTitle>
          <CardDescription>
            {isLogin ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                    placeholder={t("auth.firstNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redcapRecordId">{t("auth.redcapId")}</Label>
                  <Input
                    id="redcapRecordId"
                    value={redcapRecordId}
                    onChange={(e) => setRedcapRecordId(e.target.value)}
                    required={!isLogin}
                    placeholder={t("auth.redcapIdPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {t("auth.language")}
                  </Label>
                  <div className="flex gap-2">
                    {(["en", "et", "ru"] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setSelectedLang(lang);
                          setLanguage(lang);
                        }}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedLang === lang
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {LANGUAGE_LABELS[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? t("auth.signInBtn") : t("auth.signUpBtn")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? t("auth.signUpBtn") : t("auth.signInBtn")}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
