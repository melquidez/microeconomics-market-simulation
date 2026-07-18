// Smooth light <-> dark cross-fade helpers.
//
// The DOM fades via CSS: the theme color custom properties are registered with
// @property (see globals.css) and transitioned on :root, so flipping `.dark`
// animates every var-driven color at once — like dawn fading to dusk.
//
// The canvas and Chart.js can't read CSS variables, so we interpolate their
// palettes in JS using the SAME duration/easing to stay perfectly in sync with
// the CSS fade.

import { useEffect, useRef, useState } from 'react';

// Keep this in sync with the `transition` duration on :root in globals.css.
export const THEME_TRANSITION_MS = 700;

// easeInOutQuad — close to CSS `ease`; reads as a gentle dawn/dusk fade.
function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

function parseColor(c: string): RGBA {
    const s = c.trim();
    if (s.startsWith('#')) {
        const n = parseInt(s.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    const nums = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
    return { r: nums[0], g: nums[1], b: nums[2], a: nums.length > 3 ? nums[3] : 1 };
}

function lerpColor(a: string, b: string, t: number): string {
    const A = parseColor(a);
    const B = parseColor(b);
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    const alpha = A.a + (B.a - A.a) * t;
    return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

// Linearly blend two same-shaped palettes (e.g. LIGHT_COLORS / DARK_COLORS).
export function mixPalette<T extends Record<string, string>>(light: T, dark: T, t: number): T {
    const out = {} as Record<string, string>;
    for (const key of Object.keys(light)) {
        // `glow` is identical in both palettes and isn't a full color string.
        if (key === 'glow') {
            out[key] = light[key];
            continue;
        }
        out[key] = lerpColor(light[key], dark[key], t);
    }
    return out as T;
}

export interface AxisColors {
    grid: string;
    tick: string;
    title: string;
    legend: string;
}

export function mixAxis(light: AxisColors, dark: AxisColors, t: number): AxisColors {
    return {
        grid: lerpColor(light.grid, dark.grid, t),
        tick: lerpColor(light.tick, dark.tick, t),
        title: lerpColor(light.title, dark.title, t),
        legend: lerpColor(light.legend, dark.legend, t),
    };
}

// Animates 0 (light) -> 1 (dark) over THEME_TRANSITION_MS whenever `theme`
// flips, and returns the live mix so callers can interpolate palettes each
// frame. The initial value matches `theme` so there's no fade on first mount.
export function useThemeMix(theme: 'light' | 'dark', duration = THEME_TRANSITION_MS): number {
    const [mix, setMix] = useState(theme === 'dark' ? 1 : 0);
    const mixRef = useRef(mix);
    useEffect(() => {
        mixRef.current = mix;
    }, [mix]);

    useEffect(() => {
        const target = theme === 'dark' ? 1 : 0;
        const from = mixRef.current;
        if (from === target) return;

        const start = performance.now();
        let raf = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const val = from + (target - from) * easeInOut(t);
            mixRef.current = val;
            setMix(val);
            if (t < 1) {
                raf = requestAnimationFrame(step);
            } else {
                mixRef.current = target;
                setMix(target);
            }
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [theme, duration]);

    return mix;
}
