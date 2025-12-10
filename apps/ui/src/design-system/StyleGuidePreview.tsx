import React from 'react';
import type { DesignTheme } from './types';
import { buildCssVariablesFromTheme } from './cssVariables';

interface StyleGuidePreviewProps {
  theme: DesignTheme;
}

// Self-contained style guide preview. It does not rely on the app's global theme.
export const StyleGuidePreview: React.FC<StyleGuidePreviewProps> = ({ theme }) => {
  const cssVars = buildCssVariablesFromTheme(theme);

  return (
    <div
      className="h-full w-full flex flex-col text-xs"
      style={cssVars as React.CSSProperties}
    >
      <div className="flex-none px-4 py-3 border-b" style={{
        background: 'var(--color-background-secondary)',
        borderColor: 'var(--color-border)',
      }}>
        <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          Design System Preview
        </div>
        <div className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
          CORE UI Style Guide
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'var(--color-background)' }}>
        {/* Typography */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Typography
          </h3>
          <div className="space-y-1 p-3 rounded border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Heading 1</div>
            <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Heading 2</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Heading 3</div>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Body text – The quick brown fox jumps over the lazy dog.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Secondary text – The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Colors
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {['primary', 'secondary', 'accent', 'success'].map((token) => (
              <div key={token} className="flex items-center gap-2 p-2 rounded border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }}>
                <div
                  className="w-6 h-6 rounded shadow"
                  style={{ background: `var(--color-${token})` }}
                />
                <div>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>{token}</div>
                  <div className="text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>
                    var(--color-{token})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons & Inputs */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Components
          </h3>
          <div className="flex flex-wrap gap-2 p-3 rounded border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }}>
            <button
              className="px-3 py-1.5 rounded text-xs font-bold"
              style={{
                background: 'var(--color-primary)',
                color: '#000',
                boxShadow: '0 0 16px rgba(0,0,0,0.6)',
              }}
            >
              Primary
            </button>
            <button
              className="px-3 py-1.5 rounded text-xs font-bold border"
              style={{
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-secondary)',
              }}
            >
              Secondary
            </button>
            <button
              className="px-3 py-1.5 rounded text-xs font-bold border"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
                background: 'transparent',
              }}
            >
              Outline
            </button>
            <button
              className="relative px-3 py-1.5 rounded text-xs font-bold overflow-hidden"
              style={{ color: '#000' }}
            >
              <span
                className="absolute inset-0 opacity-90"
                style={{ background: 'var(--gradient-button)' }}
              />
              <span className="relative z-10">Gradient</span>
            </button>
            <input
              className="px-2 py-1.5 rounded text-xs border flex-1 min-w-[120px]"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              placeholder="Input field"
            />
          </div>
        </section>

        {/* Mini layout */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Layout Mock
          </h3>
          <div className="h-40 rounded border overflow-hidden flex" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }}>
            <aside className="h-full w-24 border-r flex flex-col text-[10px]" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }}>
              <div className="px-2 py-1 font-bold" style={{ color: 'var(--color-primary)' }}>CORE</div>
              <div className="px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>Dashboard</div>
              <div className="px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>CORE</div>
              <div className="px-2 py-1" style={{ color: 'var(--color-text-secondary)' }}>Settings</div>
            </aside>
            <div className="flex-1 flex flex-col">
              <div className="flex-none h-8 border-b flex items-center justify-between px-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  CORE Workspace
                </span>
                <button
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'var(--color-primary)', color: '#000' }}
                >
                  Action
                </button>
              </div>
              <div className="flex-1 p-2 grid grid-cols-2 gap-2" style={{ background: 'var(--color-background-secondary)' }}>
                <div className="rounded border p-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    Node Canvas
                  </div>
                  <div className="mt-1 h-10 rounded" style={{ background: 'var(--gradient-surface)' }} />
                </div>
                <div className="rounded border p-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    Inspector
                  </div>
                  <div className="mt-1 h-10 rounded border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-secondary)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

