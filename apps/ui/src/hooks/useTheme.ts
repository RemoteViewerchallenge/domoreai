import { useNewUITheme } from '../components/appearance/NewUIThemeProvider';

// Mapping needed because the old useTheme hook return structure 
// matches the old Context, but now we are using the NewUIThemeProvider.
// We proxy the calls to the new provider.

// Original ThemeContextValue interface:
// interface ThemeContextValue {
//   theme: Theme;
//   setTheme: (partial: Partial<Theme>) => void;
//   applyPreset: (preset: ThemePreset) => void;
//   resetToDefault: () => void;
// }

export const useTheme = () => {
  const { theme, setTheme: setNewTheme } = useNewUITheme();

  // Adapter to match old hook signature if necessary, 
  // or simply expose what we have if the consumer is flexible.
  // WorkSpace.tsx expects: { theme, setTheme }
  
  // The old setTheme took a partial. The new one takes a SetStateAction.
  // We need to adapt it.
  const setTheme = (partial: any) => {
     setNewTheme((prev) => ({ ...prev, ...partial }));
  };
  
  // Mock other functions if needed by legacy components
  const applyPreset = () => console.warn('applyPreset not implemented in adapter');
  const resetToDefault = () => console.warn('resetToDefault not implemented in adapter');

  return { theme, setTheme, applyPreset, resetToDefault };
};