// AI INSTRUCTION FILE
// When generating UI for this project, NEVER use hardcoded styles.
// ALWAYS use the following CSS Variables and Components.

export const AI_DESIGN_TOKENS = {
  // 1. Font Families (CSS Variables)
  fonts: {
    "Heading": "var(--font-heading)", 
    "Body Text": "var(--font-body)",
    "Code/Mono": "var(--font-mono)"
  },

  // 2. Surface & Backgrounds
  surfaces: {
    "Primary Layer": "var(--bg-primary)", // Can be a dynamic gradient
    "Secondary Layer": "var(--bg-secondary)",
    "Surface/Glass": "var(--bg-surface)"
  },

  // 3. Colors
  colors: {
    "Brand": "var(--color-primary)",
    "Secondary": "var(--color-secondary)",
    "Accent": "var(--color-accent)",
    "Background": "var(--color-background)",
    "Border": "var(--color-border)",
    "Text Main": "var(--color-text)",
    "Text Muted": "var(--color-textMuted)"
  },

  // 4. Components
  icons: {
    instruction: "Do not use <Lucide.IconName>. Use <TokenIcon token='TOKEN_NAME' />",
    tokens: [
      "action.save",    // For save buttons
      "action.delete",  // For destructive actions
      "nav.home",       // For home links
      "nav.settings",   // For configuration
      "status.error",   // For error alerts
      "status.success"  // For success messages
    ]
  }
};
