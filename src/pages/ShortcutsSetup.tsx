import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Plus, Trash2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface ApiToken {
  id: string;
  token: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

const ShortcutsSetup = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const endpointUrl = `https://${projectId}.supabase.co/functions/v1/health-data-import`;

  useEffect(() => {
    if (!user) return;
    fetchTokens();
  }, [user]);

  const fetchTokens = async () => {
    const { data } = await supabase
      .from("user_api_tokens")
      .select("*")
      .order("created_at", { ascending: false }) as { data: ApiToken[] | null };
    if (data) setTokens(data.filter((t) => !t.revoked));
  };

  const generateToken = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_api_tokens").insert({
      user_id: user.id,
      name: "Apple Shortcuts",
    } as any);
    if (error) {
      toast.error("Failed to generate token");
    } else {
      toast.success("API token generated!");
      await fetchTokens();
    }
    setLoading(false);
  };

  const revokeToken = async (id: string) => {
    await supabase.from("user_api_tokens").update({ revoked: true } as any).eq("id", id);
    toast.success("Token revoked");
    await fetchTokens();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const activeToken = tokens[0];

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Apple Shortcuts Setup</h1>
            <p className="text-sm text-muted-foreground">
              Auto-sync Apple Health data daily
            </p>
          </div>
        </div>

        {/* Step 1: API Token */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
              Generate Your API Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeToken ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your active token:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">
                    {activeToken.token}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(activeToken.token)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {activeToken.last_used_at && (
                  <p className="text-xs text-muted-foreground">
                    Last used: {new Date(activeToken.last_used_at).toLocaleDateString()}
                  </p>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeToken(activeToken.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Revoke Token
                </Button>
              </div>
            ) : (
              <Button onClick={generateToken} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" /> Generate Token
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Endpoint URL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
              Copy the Endpoint URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">
                {endpointUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(endpointUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Create Shortcut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
              Create the Apple Shortcut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Open the <strong>Shortcuts</strong> app on your iPhone and create a new shortcut with these actions:
            </p>

            <div className="space-y-3">
              <StepItem number="3a" title="Find Health Samples">
                <p>Add <strong>"Find Health Samples"</strong> for each metric:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li><strong>Step Count</strong> — Type: Steps, Start Date: Start of Today, Sort by: Start Date</li>
                  <li><strong>Heart Rate</strong> — Type: Heart Rate, Start Date: Start of Today</li>
                  <li><strong>Blood Oxygen</strong> — Type: Blood Oxygen, Start Date: Start of Today</li>
                  <li><strong>Sleep Analysis</strong> — Type: Sleep Analysis, Start Date: Start of Today</li>
                </ul>
              </StepItem>

              <StepItem number="3b" title="Build a Dictionary">
                <p>Add a <strong>"Dictionary"</strong> action with these keys:</p>
                <code className="block bg-muted p-2 rounded text-xs mt-1">
{`{
  "steps": [Step Count Value],
  "heart_rate": [Heart Rate Value],
  "spo2": [Blood Oxygen Value × 100],
  "sleep_hours": [Sleep Duration in Hours],
  "stress_level": 0
}`}
                </code>
              </StepItem>

              <StepItem number="3c" title="Get Contents of URL">
                <p>Add <strong>"Get Contents of URL"</strong>:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li><strong>URL</strong>: Paste the endpoint URL from Step 2</li>
                  <li><strong>Method</strong>: POST</li>
                  <li><strong>Headers</strong>:
                    <ul className="list-disc list-inside ml-4">
                      <li><code>Content-Type</code>: <code>application/json</code></li>
                      <li><code>x-api-token</code>: Paste your token from Step 1</li>
                    </ul>
                  </li>
                  <li><strong>Request Body</strong>: JSON — use the Dictionary from Step 3b</li>
                </ul>
              </StepItem>

              <StepItem number="3d" title="Automate It">
                <p>Go to <strong>Automation</strong> tab → <strong>Create Personal Automation</strong>:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li>Trigger: <strong>Time of Day</strong> → e.g., 10:00 PM daily</li>
                  <li>Action: <strong>Run Shortcut</strong> → select the shortcut you created</li>
                  <li>Turn off "Ask Before Running"</li>
                </ul>
              </StepItem>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works</p>
                <p>
                  The Apple Shortcut reads your health data from Apple Health and sends it 
                  to TalLipid automatically each evening. Your data appears in the app as 
                  if synced from a watch. No watch required!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function StepItem({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-mono">{number}</span>
        {title}
      </h4>
      <div className="text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

export default ShortcutsSetup;
