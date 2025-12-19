import { DataBinding } from '../core/types.js';

export const useDataResolver = (props: Record<string, any>, bindings: DataBinding[] = [], contextData: any) => {
  if (!bindings || bindings.length === 0) return props;

  const resolvedProps = { ...props };

  bindings.forEach(binding => {
    // Check if contextData is valid before trying to get
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

// Simple safe getter
function resolvePath(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
