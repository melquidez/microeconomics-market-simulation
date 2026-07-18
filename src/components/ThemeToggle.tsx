'use client';

import React from 'react';
import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import type { Theme } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export const ThemeToggle: React.FC = () => {
    const { resolvedTheme, setTheme } = useTheme();

    // `useSyncExternalStore` returns `false` on the server and the client's
    // first (hydration) render, then `true` after mount. That keeps the button
    // identical on server and client so there's no theme hydration mismatch —
    // the server renders the default light icon, while next-themes' pre-paint
    // script may have already set `.dark` on <html>, which we only read after
    // mounting.
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    // Pre-mount: stable placeholder (no real theme yet) to avoid mismatch.
    if (!mounted) {
        return (
            <button
                type="button"
                aria-label="Toggle color theme"
                className="rounded-md border border-border bg-panel px-2 py-1 text-sm text-foreground"
            >
                <FontAwesomeIcon icon={faMoon} />
            </button>
        );
    }

    const theme = (resolvedTheme ?? 'light') as Theme;
    const isDark = theme === 'dark';
    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-md border border-border bg-panel px-2 py-1 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
        </button>
    );
};
