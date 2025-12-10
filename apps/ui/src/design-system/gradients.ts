// Curated gradient options for design-system usage.

export interface GradientOption {
  id: string;
  name: string;
  value: string; // CSS linear-gradient(...) or var(--gradient-*)
}

export const gradientOptions: GradientOption[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    value: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #9d00ff 100%)',
  },
  {
    id: 'oceanic',
    name: 'Oceanic',
    value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    value: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
  },
  {
    id: 'forest',
    name: 'Forest',
    value: 'linear-gradient(135deg, #5a9216 0%, #00c853 100%)',
  },
  {
    id: 'plasma',
    name: 'Plasma',
    value: 'linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)',
  },
];

