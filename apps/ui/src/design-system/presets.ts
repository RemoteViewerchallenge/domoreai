import type { DesignThemePreset } from './types';

export const defaultDesignThemePresets: DesignThemePreset[] = [
  {
    id: 'core-dark',
    name: 'CORE Dark',
    description: 'Baseline dark theme for CORE and future pages.',
    theme: {
      colors: {
        primary: '#00FFFF',
        secondary: '#9D00FF',
        accent: '#FF00FF',
        success: '#00FF7F',
        background: '#020617',
        backgroundSecondary: '#020617',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        border: '#1F2933',
      },
      gradients: {
        primary: 'linear-gradient(135deg, #00ffff 0%, #9d00ff 100%)',
        accent: 'linear-gradient(135deg, #ff00ff 0%, #9d00ff 100%)',
        surface: 'linear-gradient(145deg, rgba(15,23,42,1) 0%, rgba(30,64,175,1) 100%)',
        button: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #9d00ff 100%)',
      },
      typography: {
        fontFamilyUi: 'system',
        fontFamilyMono: 'mono',
        baseSize: 13,
        secondarySize: 11,
      },
      visual: {
        borderWidth: 1,
        glowIntensity: 60,
        radiusScale: 1,
        density: 'compact',
      },
    },
  },
  {
    id: 'calm-solarized',
    name: 'Calm Solarized',
    description: 'Softer contrast palette for long sessions.',
    theme: {
      colors: {
        primary: '#268BD2',
        secondary: '#D33682',
        accent: '#B58900',
        success: '#859900',
        background: '#002B36',
        backgroundSecondary: '#073642',
        text: '#EEE8D5',
        textSecondary: '#93A1A1',
        border: '#073642',
      },
      gradients: {
        primary: 'linear-gradient(135deg, #268BD2 0%, #6C71C4 100%)',
        accent: 'linear-gradient(135deg, #B58900 0%, #CB4B16 100%)',
        surface: 'linear-gradient(145deg, #002B36 0%, #073642 100%)',
        button: 'linear-gradient(135deg, #268BD2 0%, #2AA198 100%)',
      },
      typography: {
        fontFamilyUi: 'humanist',
        fontFamilyMono: 'mono',
        baseSize: 14,
        secondarySize: 12,
      },
      visual: {
        borderWidth: 1,
        glowIntensity: 20,
        radiusScale: 0.8,
        density: 'standard',
      },
    },
  },
];

