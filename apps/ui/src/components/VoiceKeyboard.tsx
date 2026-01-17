/**
 * Voice Keyboard Overlay Component
 * 
 * Floating overlay for voice-to-text input
 * Can be triggered with right-click or keyboard shortcut
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Check } from 'lucide-react';
import { Button } from './ui/button';

interface VoiceKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSubmit: (text: string) => void;
  position?: { x: number; y: number };
}

export const VoiceKeyboard: React.FC<VoiceKeyboardProps> = ({
  isOpen,
  onClose,
  onTextSubmit,
  position = { x: 0, y: 0 },
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setTranscribedText('');
      setConfidence(0);
    }
  }, [isOpen]);

  const handleStartListening = useCallback(() => {
    setIsListening(true);
    // TODO: Integrate with voice input controller
    // For now, simulating with timeout
    setTimeout(() => {
      setTranscribedText('Sample transcribed text');
      setConfidence(0.95);
      setIsListening(false);
    }, 2000);
  }, []);

  const handleStopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (transcribedText.trim()) {
      onTextSubmit(transcribedText);
      onClose();
    }
  }, [transcribedText, onTextSubmit, onClose]);

  const handleCancel = useCallback(() => {
    setIsListening(false);
    onClose();
  }, [onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && !isListening) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isListening, handleCancel, handleSubmit]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed z-[9999]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 min-w-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic className={`w-5 h-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                <span className="text-sm font-medium text-zinc-200">
                  {isListening ? 'Listening...' : 'Voice Keyboard'}
                </span>
              </div>
              
              <button
                onClick={handleCancel}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transcribed Text Display */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-4 min-h-[80px]">
              {transcribedText ? (
                <div>
                  <p className="text-zinc-200 text-sm">{transcribedText}</p>
                  {confidence > 0 && (
                    <div className="mt-2 text-xs text-zinc-500">
                      Confidence: {(confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm italic">
                  {isListening ? 'Speak now...' : 'Click microphone to start'}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!isListening ? (
                <>
                  <Button
                    onClick={handleStartListening}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  
                  {transcribedText && (
                    <Button
                      onClick={handleSubmit}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Submit
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleCancel}
                    size="sm"
                    variant="outline"
                    className="border-zinc-700"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleStopListening}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white flex-1"
                >
                  Stop
                </Button>
              )}
            </div>

            {/* Hint */}
            <div className="mt-3 text-xs text-zinc-500 text-center">
              Press ESC to cancel • Enter to submit
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceKeyboard;
