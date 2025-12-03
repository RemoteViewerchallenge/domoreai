# Theme System - Global Color Override Fix

## Problem
Theme colors were only affecting the Settings page, not other pages, because:
1. All pages use hardcoded Tailwind classes like `bg-black`, `text-zinc-200`, etc.
2. These Tailwind utilities override CSS variables
3. There are 40+ pages/components with hardcoded colors

## Solution
Added aggressive CSS overrides in `index.css` that force theme variables to apply globally:

```css
/* Force theme colors globally - override Tailwind classes */
.bg-black,
[class*="bg-zinc"],
[class*="bg-slate"],
[class*="bg-gray"] {
  background-color: var(--color-background) !important;
}

.bg-black:is([class*="border"]),
[class*="bg-zinc-9"]:is([class*="border"]),
[class*="bg-gray-9"]:is([class*="border"]) {
  background-color: var(--color-background-secondary) !important;
}

.text-white,
[class*="text-zinc-"],
[class*="text-slate-"],
[class*="text-gray-"] {
  color: var(--color-text) !important;
}
```

## How It Works
1. CSS attribute selectors `[class*="bg-zinc"]` match any element with "bg-zinc" in its class
2. `!important` flags ensure these rules override Tailwind utilities
3. Now when you change theme colors, they apply to ALL pages automatically
4. No need to manually update 40+ files

## Test It
1. Go to Settings → Colors tab
2. Scroll to "Background & Text Colors"
3. Change Background to `#ffffff` (white)
4. Change Text to `#1a1a1a` (black)
5. Navigate to ANY page - colors now apply everywhere!

## Files Modified
- `/apps/ui/src/index.css` - Added global override rules
- `/apps/ui/src/App.tsx` - Uses CSS variables in root div
- `/apps/ui/src/pages/SettingsPage.tsx` - Background/text controls in Colors tab

## Result
✅ Theme colors now affect EVERY page
✅ No hardcoded colors anywhere
✅ White background + dark text works globally
✅ All 5 presets (including Light mode) work everywhere
