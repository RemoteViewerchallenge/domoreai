import React, { useState } from 'react';
import { Terminal, Key, Server, Loader2, X } from 'lucide-react';

interface SshConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: SshConfig) => Promise<void>;
  isConnecting: boolean;
}

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  privateKey?: string;
  password?: string;
}

export const SshConnectionModal: React.FC<SshConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting
}) => {
  const [config, setConfig] = useState<SshConfig>({
    host: '',
    port: 22,
    username: 'root',
    authType: 'key',
    privateKey: '',
    password: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[400px] bg-zinc-950 border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
            <Terminal size={14} />
            <span>SSH Remote Connection</span>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase text-[var(--color-text-secondary)] font-bold">Host</label>
              <div className="relative">
                <Server size={12} className="absolute left-2.5 top-2.5 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  required
                  placeholder="192.168.1.1"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-8 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  value={config.host}
                  onChange={e => setConfig({ ...config, host: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[var(--color-text-secondary)] font-bold">Port</label>
              <input
                type="number"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none transition-colors text-center"
                value={config.port}
                onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[var(--color-text-secondary)] font-bold">Username</label>
            <input
              type="text"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none transition-colors"
              value={config.username}
              onChange={e => setConfig({ ...config, username: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="authType" 
                  checked={config.authType === 'key'} 
                  onChange={() => setConfig({ ...config, authType: 'key' })}
                  className="accent-cyan-500"
                />
                <span className={`text-xs font-bold ${config.authType === 'key' ? 'text-cyan-400' : 'text-[var(--color-text-secondary)]'}`}>SSH Key</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="authType" 
                  checked={config.authType === 'password'} 
                  onChange={() => setConfig({ ...config, authType: 'password' })}
                  className="accent-cyan-500"
                />
                <span className={`text-xs font-bold ${config.authType === 'password' ? 'text-cyan-400' : 'text-[var(--color-text-secondary)]'}`}>Password</span>
              </label>
            </div>

            {config.authType === 'key' ? (
              <div className="relative">
                <textarea
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded p-3 text-[10px] font-mono text-zinc-300 focus:border-cyan-500 focus:outline-none resize-none"
                  value={config.privateKey}
                  onChange={e => setConfig({ ...config, privateKey: e.target.value })}
                />
                <Key size={12} className="absolute right-3 top-3 text-zinc-600" />
              </div>
            ) : (
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                value={config.password}
                onChange={e => setConfig({ ...config, password: e.target.value })}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full bg-cyan-900/30 border border-cyan-600 text-cyan-400 hover:bg-cyan-900/50 hover:text-white py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Terminal size={14} />}
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
};
