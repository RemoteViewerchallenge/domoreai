
// 1. The Definitions (The "What")
const DENSITY_COMFORTABLE = {
  padding: '1.5rem',
  gap: '1rem',
  fontSize: '16px',
  inputHeight: '40px'
};

const DENSITY_COMPACT = { // For your Workbench
  padding: '0.5rem',
  gap: '0.25rem',
  fontSize: '12px',
  inputHeight: '24px'
};

// 2. The Scopes (The "Where")
// We will apply these class names to the ROOT of the workbench vs the ROOT of the preview
export const THEME_SCOPES = {
  workbench: 'theme-scope-workbench', // Internal Tooling
  app: 'theme-scope-app'             // The User's Built App
};

// 3. The CSS Injector (Call this once at startup)
export const injectThemeScopes = () => {
  const css = `
    /* WORKBENCH (High Density, Dark) */
    .${THEME_SCOPES.workbench} {
      --nebula-space-base: ${DENSITY_COMPACT.padding};
      --nebula-space-gap: ${DENSITY_COMPACT.gap};
      --nebula-text-base: ${DENSITY_COMPACT.fontSize};
      --nebula-comp-height: ${DENSITY_COMPACT.inputHeight};
      --nebula-bg-primary: #09090b; /* Zinc 950 */
      --nebula-text-primary: #e4e4e7; /* Zinc 200 */
    }

    /* APP (Variable Density, User Defined) */
    .${THEME_SCOPES.app} {
      --nebula-space-base: ${DENSITY_COMFORTABLE.padding};
      --nebula-space-gap: ${DENSITY_COMFORTABLE.gap};
      --nebula-text-base: ${DENSITY_COMFORTABLE.fontSize};
      --nebula-comp-height: ${DENSITY_COMFORTABLE.inputHeight};
      /* Colors are dynamic here */
    }
  `;
  
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);
};
