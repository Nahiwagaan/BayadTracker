import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

type ColorSchemeContextValue = {
  scheme: AppColorScheme;
  setScheme: (scheme: AppColorScheme) => void;
  toggleScheme: () => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const systemScheme = (useSystemColorScheme() ?? 'light') as AppColorScheme;
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

  return (useSystemColorScheme() ?? 'light') as AppColorScheme;
}

export function useToggleColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  return ctx?.toggleScheme ?? (() => {});
}
