import React, { useRef, useEffect } from 'react';
import { Send, Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';

export interface ChatComposerProps {
  inputText: string;
  onInputChange: (val: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputText,
  onInputChange,
  onSend,
  disabled = false,
  placeholder = 'Ask anything...',
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscriptChange: (text) => {
      onInputChange(text);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    },
  });

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(inputText);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-3 bg-white dark:bg-[#0a0a0c] border-t border-slate-200 dark:border-white/10 flex flex-col space-y-2 relative ${className}`}
    >
      {/* Listening State Banner with Pulse Animation */}
      {isListening && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-medium animate-pulse shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Listening... Speak clearly</span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="text-[10px] underline hover:opacity-80 cursor-pointer uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && !isListening && (
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-slate-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 text-[10px]">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end space-x-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : placeholder}
          disabled={disabled}
          className="flex-1 bg-slate-100 dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all resize-none max-h-28 overflow-y-auto leading-relaxed"
        />

        {/* Microphone Button with Active Pulse Animation */}
        {isSupported && (
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={disabled}
            title={isListening ? 'Stop recording voice' : 'Speak message (Voice-to-Text)'}
            className={`p-2.5 rounded-xl font-medium transition-all flex-shrink-0 cursor-pointer ${
              isListening
                ? 'bg-black text-white dark:bg-white dark:text-black ring-2 ring-red-500 animate-pulse scale-105'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            {isListening ? (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className={`p-2.5 rounded-xl font-medium transition-all flex-shrink-0 ${
            inputText.trim() && !disabled
              ? 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 shadow-md cursor-pointer'
              : 'bg-slate-200 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500 px-1 pt-0.5">
        <span>Grounded in verified Company Brain</span>
        <span>Enter to send · Shift+Enter for new line</span>
      </div>
    </form>
  );
};
