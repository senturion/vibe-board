# Theme Picker Design

## Summary

Replace the binary dark/light toggle with an 8-theme picker using a color dot grid UI. Themes are standalone (not paired dark/light variants). Some themes include custom font pairings.

## Approach

**Approach A: CSS-defined themes.** All themes defined as `[data-theme="id"]` blocks in `globals.css`. A TypeScript registry maps theme IDs to display metadata. Zero runtime overhead — CSS custom properties handle everything.

## Themes

| ID | Name | Type | BG | Accent | Display Font | Body Font |
|---|---|---|---|---|---|---|
| `ember` | Ember | dark | `#0c0b0a` | `#e07a5f` coral | Instrument Serif | DM Sans |
| `sand` | Sand | light | `#faf8f5` | `#d4694e` coral | Instrument Serif | DM Sans |
| `midnight` | Midnight | dark | `#0a0e1a` | `#6c8aec` soft blue | Instrument Serif | DM Sans |
| `forest` | Forest | dark | `#0b120d` | `#c4a35a` amber/gold | Instrument Serif | DM Sans |
| `nord` | Nord | dark | `#1a1e2e` | `#88c0d0` frost blue | Inter | Inter |
| `mono` | Mono | dark | `#111111` | `#ffffff` white | JetBrains Mono | JetBrains Mono |
| `ocean` | Ocean | dark | `#0a1419` | `#4db8a4` teal | Instrument Serif | DM Sans |
| `paper` | Paper | light | `#f4f1ec` | `#2d2d2d` charcoal | Playfair Display | Source Serif 4 |

Each theme defines the full set of CSS custom properties: backgrounds, borders, text, accent, status colors, chart colors, and all feature-specific colors (habits, focus, goals, routines, journal moods, heatmap).

## Theme Registry (`lib/themes.ts`)

Exports a `THEMES` array. Each entry:
- `id` — `data-theme` attribute value
- `name` — display name
- `type` — `'dark' | 'light'` (for OS preference fallback)
- `colors` — `{ bg: string, accent: string }` for picker dot rendering
- `fontDisplay` / `fontBody` — font family names

## Theme Picker UI

Replaces the Light/Dark toggle in SettingsPanel General section. Compact grid of ~28-32px circles, each showing a split of the theme's bg + accent colors. Active theme gets an accent ring. Theme name shown as a label beneath each dot.

## useTheme Hook Changes

- `Theme` type becomes union of theme IDs (`'ember' | 'sand' | 'midnight' | ...`)
- `setTheme(id)` sets `data-theme`, stores in localStorage + Supabase
- `toggleTheme` removed (no longer binary)
- `isDark` / `isLight` derived from registry `type` field
- Invalid/missing theme falls back based on OS preference → `'ember'` (dark) or `'sand'` (light)

## Font Loading

Load all fonts in `app/layout.tsx` via `next/font/google`: Instrument Serif, DM Sans (existing), plus Inter, JetBrains Mono, Playfair Display, Source Serif 4 (new). Each assigned to a CSS variable. Themes reference fonts via `--font-display` and `--font-body` vars.

## Migration

- `theme: 'dark'` in localStorage/Supabase → `'ember'`
- `theme: 'light'` in localStorage/Supabase → `'sand'`
- Hook handles migration on init

## CSS Structure

Each theme is a `[data-theme="<id>"]` block in `globals.css` with the same variable structure as existing themes. The `:root` block sets `ember` as default.
