import React from 'react';
import { Globe, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const BrowserCapability = () => {
  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 overflow-hidden rounded-b-lg">
      {/* Browser Toolbar */}
      <div className="flex items-center p-2 bg-slate-800 border-b border-slate-700 gap-2">
        <div className="flex gap-1 text-slate-400">
             <ChevronLeft size={16} />
             <ChevronRight size={16} />
             <RefreshCw size={16} />
        </div>
        <div className="flex-1 bg-slate-950 px-3 py-1.5 rounded-full text-sm text-slate-300 flex items-center gap-2">
            <Globe size={14} className="text-slate-500" />
            <span>google.com</span>
        </div>
      </div>
      
      {/* Webview Placeholder */}
      <div className="flex-1 bg-[#fff] flex items-center justify-center text-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="text-center z-10">
              <Globe size={48} className="mx-auto text-blue-500 mb-4 opacity-50" />
              <h3 className="font-bold text-lg text-slate-700">Electron Webview</h3>
              <p className="text-slate-500 text-sm">Active Browser Session</p>
          </div>
      </div>
    </div>
  );
};
