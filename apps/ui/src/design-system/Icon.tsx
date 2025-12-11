/**
 * Design System Icon Component
 * 
 * Unified Icon wrapper supporting both Lucide (line icons) and Phosphor (filled/duotone) icons.
 * This provides a single, consistent interface for using icons across the application.
 * 
 * @example
 * ```tsx
 * import { Icon } from '../design-system/Icon';
 * 
 * // Lucide icon (default, line style)
 * <Icon name="Settings" size={24} />
 * <Icon name="Home" source="lucide" />
 * 
 * // Phosphor icon with weight variants
 * <Icon name="Robot" source="phosphor" weight="duotone" size={32} />
 * <Icon name="Heart" source="phosphor" weight="fill" />
 * ```
 */

export { Icon } from '../components/ui/Icon.js';
export type { IconSource, IconName } from '../components/ui/Icon.js';
