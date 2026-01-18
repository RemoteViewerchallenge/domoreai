import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface VoiceKeyboardContextType {
  isOpen: boolean;
  isContextMenuOpen: boolean;
  position: { x: number; y: number };
  targetElement: HTMLElement | null;
  openContextMenu: (x: number, y: number, target: HTMLElement) => void;
  closeContextMenu: () => void;
  openVoiceKeyboard: () => void;
  closeVoiceKeyboard: () => void;
  submitText: (text: string) => void;
}

const VoiceKeyboardContext = createContext<VoiceKeyboardContextType | undefined>(undefined);

export function VoiceKeyboardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const openContextMenu = useCallback((x: number, y: number, target: HTMLElement) => {
    setPosition({ x, y });
    setTargetElement(target);
    setIsContextMenuOpen(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  const openVoiceKeyboard = useCallback(() => {
    setIsContextMenuOpen(false);
    setIsOpen(true);
  }, []);

  const closeVoiceKeyboard = useCallback(() => {
    setIsOpen(false);
    setTargetElement(null);
  }, []);

  const submitText = useCallback((text: string) => {
    if (targetElement) {
      // Handle standard input/textarea
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        const start = targetElement.selectionStart || 0;
        const end = targetElement.selectionEnd || 0;
        const currentValue = targetElement.value;
        
        // Insert text at cursor position
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        targetElement.value = newValue;
        
        // Trigger input event for React
        const event = new Event('input', { bubbles: true });
        targetElement.dispatchEvent(event);
        
        // Set cursor position after inserted text
        const newCursorPos = start + text.length;
        targetElement.setSelectionRange(newCursorPos, newCursorPos);
        targetElement.focus();
      }
      // Handle TipTap editor (ProseMirror)
      else if (targetElement.classList.contains('ProseMirror') || targetElement.closest('.ProseMirror')) {
        const proseMirrorElement = targetElement.classList.contains('ProseMirror') 
          ? targetElement 
          : targetElement.closest('.ProseMirror') as HTMLElement;
        
        if (proseMirrorElement) {
          // Insert text as HTML at the end
          const currentHTML = proseMirrorElement.innerHTML;
          proseMirrorElement.innerHTML = currentHTML + `<p>${text}</p>`;
          
          // Trigger input event for TipTap
          const event = new Event('input', { bubbles: true });
          proseMirrorElement.dispatchEvent(event);
          proseMirrorElement.focus();
        }
      }
    }
    closeVoiceKeyboard();
  }, [targetElement, closeVoiceKeyboard]);

  return (
    <VoiceKeyboardContext.Provider
      value={{
        isOpen,
        isContextMenuOpen,
        position,
        targetElement,
        openContextMenu,
        closeContextMenu,
        openVoiceKeyboard,
        closeVoiceKeyboard,
        submitText,
      }}
    >
      {children}
    </VoiceKeyboardContext.Provider>
  );
}

export function useVoiceKeyboard() {
  const context = useContext(VoiceKeyboardContext);
  if (!context) {
    throw new Error('useVoiceKeyboard must be used within VoiceKeyboardProvider');
  }
  return context;
}
