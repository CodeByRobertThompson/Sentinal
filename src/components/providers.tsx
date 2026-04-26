"use client";

import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from '@/components/theme-provider';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="sentinel-theme">
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          {children}
        </JotaiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
