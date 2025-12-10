import { lazy, Suspense, forwardRef } from 'react';
import type { FC, ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react';

export type IconSource = 'lucide' | 'phosphor';
export type IconName = string;

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  source?: IconSource;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; // Phosphor weights
}

/**
 * Unified Icon component supporting both Lucide (line icons) and Phosphor (filled/duotone) icons
 * 
 * @example
 * // Lucide icon (default)
 * <Icon name="Settings" />
 * <Icon name="Home" source="lucide" />
 * 
 * // Phosphor icon with weight
 * <Icon name="Robot" source="phosphor" weight="duotone" />
 * <Icon name="Heart" source="phosphor" weight="fill" />
 */
const Icon = forwardRef<SVGSVGElement, IconProps>(({ name, source = 'lucide', weight, ...props }, ref) => {
  // Handle codicon icons (existing VSCode icons)
  if (name.startsWith('codicon-')) {
    return <span className={`codicon ${name}`} />;
  }

  // Load Phosphor icons
  if (source === 'phosphor') {
    const PhosphorIcon = lazy<ComponentType<PhosphorIconProps>>(() =>
      import('@phosphor-icons/react').then(module => {
        const iconName = name as keyof typeof module;
        // Check if icon exists in module
        if (iconName in module && typeof module[iconName] === 'function') {
          const IconComponent = module[iconName];
          return { default: IconComponent as ComponentType<PhosphorIconProps> };
        }
        // Return a fallback empty component if icon not found
        if (import.meta.env.DEV) {
          console.warn(`Phosphor icon "${name}" not found`);
        }
        return { default: (() => null) as ComponentType<PhosphorIconProps> };
      })
    );

    return (
      <Suspense fallback={<div style={{ width: 24, height: 24 }} />}>
        <PhosphorIcon ref={ref} weight={weight} {...(props as unknown as PhosphorIconProps)} />
      </Suspense>
    );
  }

  // Load Lucide icons (default)
  const LucideIcon = lazy<ComponentType<LucideProps>>(() =>
    import('lucide-react').then(module => {
      const iconName = name as keyof typeof module;
      // Check if icon exists in module
      if (iconName in module && typeof module[iconName] === 'function') {
        const IconComponent = module[iconName];
        return { default: IconComponent as ComponentType<LucideProps> };
      }
      // Return a fallback empty component if icon not found
      if (import.meta.env.DEV) {
        console.warn(`Lucide icon "${name}" not found`);
      }
      return { default: (() => null) as ComponentType<LucideProps> };
    })
  );

  return (
    <Suspense fallback={<div style={{ width: 24, height: 24 }} />}>
      <LucideIcon ref={ref} {...props} />
    </Suspense>
  );
});

Icon.displayName = 'Icon';

export { Icon };
