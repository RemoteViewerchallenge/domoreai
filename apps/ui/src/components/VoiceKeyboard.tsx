/**
 * Voice Keyboard Context Menu Component
 * 
 * Inline context menu for voice-to-text input
 * Appears on right-click and immediately starts recording
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

interface VoiceKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSubmit: (text: string) => void;
  position?: { x: number; y: number };
  engineId?: string; // Selected STT engine ID (for future use)
}

export const VoiceKeyboard: React.FC<VoiceKeyboardProps> = ({
  isOpen,
  onClose,
  onTextSubmit,
  position = { x: 0, y: 0 },
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((result: any) => result[0])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((result: any) => result.transcript)
            .join('');
          
          setTranscribedText(transcript);
          
          // Auto-submit when final result
          if (event.results[event.results.length - 1].isFinal) {
            setTimeout(() => {
              onTextSubmit(transcript);
              onClose();
            }, 100);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTextSubmit, onClose]);

  // Auto-start recording when opened
  useEffect(() => {
    if (isOpen && recognitionRef.current) {
      setTranscribedText('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isOpen]);

  const handleStop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onClose();
  }, [isListening, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleStop();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleStop]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[9999] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          minWidth: '200px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <div className={`${isListening ? 'animate-pulse' : ''}`}>
            {isListening ? (
              <Mic className="w-4 h-4 text-red-500" />
            ) : (
              <MicOff className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <span className="text-xs font-semibold text-zinc-300">
            {isListening ? 'Listening...' : 'Voice Input'}
          </span>
        </div>

        {/* Transcription */}
        <div className="px-3 py-2 min-h-[60px] max-w-[300px]">
          {transcribedText ? (
            <p className="text-sm text-zinc-200">{transcribedText}</p>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              {isListening ? 'Speak now...' : 'Click to start'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-zinc-800 border-t border-zinc-700 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500">ESC to cancel</span>
          <button
            onClick={handleStop}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Stop
          </button>
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        onClick={handleStop}
      />
    </AnimatePresence>
  );
};

export default VoiceKeyboard;
