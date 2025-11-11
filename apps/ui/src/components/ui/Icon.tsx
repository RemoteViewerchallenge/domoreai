import { Suspense } from 'react';
import { icons } from 'lucide-react';

const Icon = ({ name, ...props }: { name: string, [key: string]: any }) => {
  if (name.startsWith('codicon-')) {
    return <span className={`codicon ${name}`} {...props} />;
  }

  const LucideIcon = icons[name as keyof typeof icons];

  if (LucideIcon) {
    return (
      <Suspense fallback={<div />}>
        <LucideIcon {...props} />
      </Suspense>
    );
  }

  return null;
};

export default Icon;
