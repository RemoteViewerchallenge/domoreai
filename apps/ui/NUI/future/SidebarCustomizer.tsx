import React from 'react';
import { Settings, Palette, Layout as LayoutIcon, MousePointer, Type } from 'lucide-react';
import { Layout } from '../components/Layout.js';
import { AIContextButton } from '../components/AIContextButton.js';

export default function SidebarCustomizer() {
  return (
    <Layout activePage="customizer">
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sidebar Customizer</h1>
            <p className="text-zinc-400">Personalize your navigation experience and AI interactions.</p>
          </div>
          <AIContextButton context="Customizer Settings" size="md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appearance */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Palette size={20} />
              <h2 className="font-bold">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-zinc-800">
                <span className="text-sm text-zinc-300">Theme Mode</span>
                <select className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300">
                  <option>Dark (Default)</option>
                  <option>Midnight</option>
                  <option>OLED Black</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-zinc-800">
                <span className="text-sm text-zinc-300">Accent Color</span>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-600 ring-2 ring-white/20 cursor-pointer"></div>
                  <div className="w-4 h-4 rounded-full bg-blue-600 cursor-pointer opacity-50"></div>
                  <div className="w-4 h-4 rounded-full bg-green-600 cursor-pointer opacity-50"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <LayoutIcon size={20} />
              <h2 className="font-bold">Layout Density</h2>
            </div>
            <div className="space-y-2">
              {['Compact', 'Comfortable', 'Spacious'].map((mode, i) => (
                <label key={mode} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors">
                  <span className="text-sm text-zinc-300">{mode}</span>
                  <input type="radio" name="density" defaultChecked={i === 1} className="accent-blue-500" />
                </label>
              ))}
            </div>
          </div>

          {/* Input Methods */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <MousePointer size={20} />
              <h2 className="font-bold">Input & Gestures</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Multi-mouse Support</span>
                <div className="w-10 h-5 bg-green-900/50 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-green-500 rounded-full shadow"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Right-click Context Menu</span>
                <div className="w-10 h-5 bg-green-900/50 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-green-500 rounded-full shadow"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Type size={20} />
              <h2 className="font-bold">Typography</h2>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-zinc-800 text-center">
              <p className="text-2xl font-bold text-white mb-1">Inter Display</p>
              <p className="text-xs text-zinc-500">The standard font for NUI interfaces.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
