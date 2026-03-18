import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

type ColorSchemeContextValue = {
  scheme: AppColorScheme;
  setScheme: (scheme: AppColorScheme) => void;
  toggleScheme: () => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

function useHydratedSystemScheme(): AppColorScheme {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = (useSystemColorScheme() ?? 'light') as AppColorScheme;
  return hasHydrated ? system : 'light';
}

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useHydratedSystemScheme();
  const [scheme, setScheme] = useState<AppColorScheme>('light');

  const value = useMemo<ColorSchemeContextValue>(() => {
    return {
      scheme: scheme ?? systemScheme,
      setScheme,
      toggleScheme: () => setScheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    };
  }, [scheme, systemScheme]);

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

export function useColorScheme(): AppColorScheme {
  const ctx = useContext(ColorSchemeContext);
  if (ctx) return ctx.scheme;

  return useHydratedSystemScheme();
}

export function useToggleColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  return ctx?.toggleScheme ?? (() => {});
}
