import { lazy, Suspense, forwardRef } from 'react';
import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(({ name, ...props }, ref) => {
  if (name.startsWith('codicon-')) {
    return <span className={`codicon ${name}`} />;
  }

  const LucideIcon = lazy(() =>
    import('lucide-react').then(module => {
      const iconName = name as keyof typeof module;
      if (iconName in module) {
        return { default: module[iconName] as FC<LucideProps> };
      }
      // Return a fallback component or null if the icon is not found
      return { default: () => null };
    })
  );

  return (
    <Suspense fallback={<div style={{ width: 24, height: 24 }} />}>
      <LucideIcon ref={ref} {...props} />
    </Suspense>
  );
}); // Closing parenthesis for forwardRef

Icon.displayName = 'Icon';

export { Icon };
