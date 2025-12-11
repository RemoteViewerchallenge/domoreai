/**
 * Design System AiButton Component
 * 
 * AI integration button for Group B implementation.
 * Opens a popover for AI prompts and integrates with ai.runWithContext tRPC endpoint.
 * 
 * Features:
 * - Context-aware AI operations (role, coorp-node, vfs, custom sources)
 * - Animation preferences via ThemeProvider
 * - Loading states and error handling
 * - Keyboard-accessible popover UI
 * 
 * @example
 * ```tsx
 * import { AiButton } from '../design-system/AiButton';
 * 
 * // In a COORP node
 * <AiButton
 *   source={{ type: 'coorp-node', nodeId: node.id }}
 *   onResult={(result) => handleAiResult(result)}
 * />
 * 
 * // In a role editor
 * <AiButton
 *   source={{ type: 'role', roleId: role.id }}
 *   defaultRoleId={role.id}
 * />
 * ```
 */

export { AiButton } from '../components/ui/AiButton.js';
export type { AiSource } from '../components/ui/AiButton.js';
