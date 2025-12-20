import type { DataBinding } from '@repo/nebula';

export const useDataResolver = (props: Record<string, any>, bindings: DataBinding[] = [], contextData: any) => {
  if (!bindings || bindings.length === 0) return props;

  const resolvedProps = { ...props };

  bindings.forEach(binding => {
    if (contextData) {
        const value = resolvePath(contextData, binding.sourcePath);
        if (value !== undefined) {
            resolvedProps[binding.propName] = value;
        } else if (binding.defaultValue !== undefined) {
             resolvedProps[binding.propName] = binding.defaultValue;
        }
    }
  });

  return resolvedProps;
};

function resolvePath(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
