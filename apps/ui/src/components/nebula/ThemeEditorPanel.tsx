import React from 'react';
import { useNebulaTheme } from '@repo/nebula/src/react/NebulaThemeProvider.js';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export const ThemeEditorPanel = () => {
  const { theme, setTheme } = useNebulaTheme();

  const updateColor = (key: keyof typeof theme.colors, value: string) => {
    setTheme({ ...theme, colors: { ...theme.colors, [key]: value } });
  };

  const updateRadius = (value: number) => {
    setTheme({ ...theme, shape: { ...theme.shape, radius: `${value}rem` } });
  };

  return (
    <div className="p-4 space-y-6 text-sm">
      <div className="space-y-4">
        <h3 className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Global Colors</h3>

        <div className="grid gap-2">
          <Label>Primary Brand</Label>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded border" style={{ background: theme.colors.primary }} />
            <Input
              value={theme.colors.primary}
              onChange={(e) => updateColor('primary', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Surface / Card</Label>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded border" style={{ background: theme.colors.surface }} />
            <Input
              value={theme.colors.surface}
              onChange={(e) => updateColor('surface', e.target.value)}
            />
          </div>
        </div>

         <div className="grid gap-2">
          <Label>Text Color</Label>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded border" style={{ background: theme.colors.text }} />
            <Input
              value={theme.colors.text}
              onChange={(e) => updateColor('text', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Shape Physics</h3>
        <div className="grid gap-2">
          <Label>Corner Radius ({theme.shape.radius})</Label>
          <Slider
            defaultValue={[parseFloat(theme.shape.radius)]}
            max={2}
            step={0.1}
            onValueChange={(v) => updateRadius(v[0])}
          />
        </div>
      </div>
    </div>
  );
};
