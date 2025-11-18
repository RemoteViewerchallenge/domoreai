export type PageType = 'VFS' | 'TERMINAL' | 'SPREADSHEET' | 'TASKS';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
