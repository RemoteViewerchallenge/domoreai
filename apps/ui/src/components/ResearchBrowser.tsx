import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Star, Search, Globe } from 'lucide-react';

export default function ResearchBrowser() {
  const [url, setUrl] = useState('https://docs.flyonui.com');
  const [history] = useState(['https://google.com', 'https://github.com']);
  
  return (
    <div className="flex flex-col h-full w-full bg-zinc-900">
      
      {/* --- BROWSER BAR --- */}
      <div className="h-10 flex items-center gap-2 px-2 bg-zinc-950 border-b border-zinc-800">
        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500"><ArrowLeft size={14}/></button>
        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500"><ArrowRight size={14}/></button>
        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500"><RotateCw size={14}/></button>
        
        {/* URL Input */}
        <div className="flex-1 relative">
            <input 
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-8 py-1 text-xs text-zinc-300 focus:border-cyan-500 focus:outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Search size={12} className="absolute left-2.5 top-2 text-zinc-600" />
            <Star size={12} className="absolute right-2.5 top-2 text-zinc-600 hover:text-yellow-500 cursor-pointer" />
        </div>
      </div>

      {/* --- VIEWPORT --- */}
      <div className="flex-1 flex min-h-0">
         {/* History / Bookmarks Sidebar */}
         <div className="w-40 border-r border-zinc-800 bg-zinc-950 p-2 overflow-y-auto">
            <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Workspace History</div>
            {history.map((link, i) => (
                <div key={i} className="truncate text-xs text-zinc-400 py-1 hover:text-cyan-400 cursor-pointer flex gap-2">
                    <Globe size={12} className="shrink-0" />
                    {link}
                </div>
            ))}
         </div>

         {/* Content Area (The "Web Page") */}
         <div className="flex-1 p-4 overflow-y-auto prose prose-invert max-w-none">
            <h1>Documentation for FlyonUI</h1>
            <p>This is a simulated "Reader View" of the website. The AI reads this text to understand the context.</p>
            {/* In a real app, this is where the scraped HTML content goes */}
         </div>
      </div>
    </div>
  );
}
