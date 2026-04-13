// AGENT REFERENCE FILE — copy this, rename it, fill in the content
// DO NOT use hardcoded colors. Every color comes from a CSS variable.
// DO NOT use bg-white, bg-gray-*, text-gray-*, bg-blue-*, border-gray-*
// EVERY className color must use var(--color-*)

import { useState } from 'react';

// ─── ICON SIZES: always use size={14} or size={16}. Never larger in headers. ───
// ─── FONT SIZES: use var(--text-sm), var(--text-base), var(--text-lg) ──────────
// ─── RADIUS: use var(--radius) for cards/inputs, var(--radius-full) for pills ──

export default function TemplatePage() {
  const [activeTab, setActiveTab] = useState('one');

  const tabs = [
    { id: 'one', label: 'Tab One' },
    { id: 'two', label: 'Tab Two' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--color-background)',
      color: 'var(--color-text)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
    }}>

      {/* ── HEADER — copy this exact pattern for every page ── */}
      <div style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--pad-lg)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
            Page Title
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            subtitle / context
          </div>
        </div>

        {/* Primary action button */}
        <button style={{
          padding: '6px 14px',
          background: 'rgba(6,182,212,0.15)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-primary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
        }}>
          Action
        </button>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        padding: '0 var(--pad-lg)',
        flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--color-primary)'
                : '2px solid transparent',
              color: activeTab === tab.id
                ? 'var(--color-primary)'
                : 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--pad-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--pad-base)',
      }}>

        {/* ── CARD — copy this pattern for every card/panel ── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 'var(--pad-base)',
        }}>
          {/* Card header */}
          <div style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--pad-sm)',
            paddingBottom: 'var(--pad-sm)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            Section Title
          </div>

          {/* Card content */}
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text)', lineHeight: 1.6 }}>
            Card content goes here.
          </p>
        </div>

        {/* ── INPUT ── */}
        <input
          placeholder="Enter value..."
          style={{
            width: '100%',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-base)',
            padding: '8px 12px',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />

        {/* ── EMPTY STATE — use when no data ── */}
        <div style={{
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 'var(--pad-lg)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
        }}>
          Nothing here yet
        </div>

        {/* ── STATUS BADGE ── */}
        <div>
          <span style={{
            padding: '2px 10px',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
          }}>
            badge
          </span>
        </div>

      </div>
    </div>
  );
}
