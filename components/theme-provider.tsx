"use client";

import { ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: '#e9ad99',
    },
    secondary: {
      main: '#f3f4f6',
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});

export function MUIThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
}
