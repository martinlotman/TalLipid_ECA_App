import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Language = "en" | "et" | "ru";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Record<string, Record<string, string>>;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const CACHE_KEY = "tallipid_translations";
const CACHE_VERSION_KEY = "tallipid_translations_version";
const LANG_KEY = "tallipid_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(LANG_KEY) as Language) || "en";
  });
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(Object.keys(translations).length === 0);

  const fetchTranslations = useCallback(async () => {
    const { data, error } = await supabase
      .from("translations")
      .select("key, en, et, ru");

    if (error || !data) return;

    const map: Record<string, Record<string, string>> = {};
    for (const row of data) {
      map[row.key] = { en: row.en, et: row.et, ru: row.ru };
    }
    setTranslations(map);
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    localStorage.setItem(CACHE_VERSION_KEY, Date.now().toString());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);

    // Update profile if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ language: lang }).eq("id", session.user.id);
    }
  }, []);

  // On auth, sync language from profile (fire-and-forget to avoid deadlocks)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fire-and-forget — do NOT await inside onAuthStateChange
        supabase
          .from("profiles")
          .select("language")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.language && ["en", "et", "ru"].includes(data.language)) {
              setLanguageState(data.language as Language);
              localStorage.setItem(LANG_KEY, data.language);
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const t = useCallback(
    (key: string): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[language] || entry.en || key;
    },
    [translations, language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  et: "Eesti",
  ru: "Русский",
};
