'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';

// Wrap the app so next-themes can manage the `.dark` class on <html>,
// persist the choice, and inject its no-flash script. Default is light.
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    );
}
