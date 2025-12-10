/**
 * Icon Component Demo
 * 
 * This file demonstrates the usage of the unified Icon component
 * with both Lucide (line icons) and Phosphor (filled/duotone) icons.
 */

import React from 'react';
import { Icon } from '../components/ui/Icon.js';

export default function IconDemo() {
  return (
    <div className="p-8 space-y-8 bg-[var(--color-background)] text-[var(--color-text)]">
      <div>
        <h1 className="text-2xl font-bold mb-4">Unified Icon Component Demo</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          Supporting both Lucide (line style) and Phosphor (filled/duotone) icons
        </p>
      </div>

      {/* Lucide Icons */}
      <section className="border border-[var(--color-border)] rounded p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-primary)]">
          Lucide Icons (Line Style)
        </h2>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Icon name="Home" size={32} />
            <span className="text-xs">Home</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Settings" size={32} />
            <span className="text-xs">Settings</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="User" size={32} />
            <span className="text-xs">User</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Search" size={32} />
            <span className="text-xs">Search</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Bell" size={32} />
            <span className="text-xs">Bell</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Zap" size={32} className="text-[var(--color-primary)]" />
            <span className="text-xs">Zap (AI)</span>
          </div>
        </div>
      </section>

      {/* Phosphor Icons - Regular */}
      <section className="border border-[var(--color-border)] rounded p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-accent)]">
          Phosphor Icons (Regular Weight)
        </h2>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Icon name="Robot" source="phosphor" weight="regular" size={32} />
            <span className="text-xs">Robot</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Brain" source="phosphor" weight="regular" size={32} />
            <span className="text-xs">Brain</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Heart" source="phosphor" weight="regular" size={32} />
            <span className="text-xs">Heart</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Star" source="phosphor" weight="regular" size={32} />
            <span className="text-xs">Star</span>
          </div>
        </div>
      </section>

      {/* Phosphor Icons - Fill */}
      <section className="border border-[var(--color-border)] rounded p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-success)]">
          Phosphor Icons (Fill Weight)
        </h2>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Icon name="Robot" source="phosphor" weight="fill" size={32} />
            <span className="text-xs">Robot Fill</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Brain" source="phosphor" weight="fill" size={32} />
            <span className="text-xs">Brain Fill</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Heart" source="phosphor" weight="fill" size={32} className="text-[var(--color-error)]" />
            <span className="text-xs">Heart Fill</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Star" source="phosphor" weight="fill" size={32} className="text-[var(--color-warning)]" />
            <span className="text-xs">Star Fill</span>
          </div>
        </div>
      </section>

      {/* Phosphor Icons - Duotone */}
      <section className="border border-[var(--color-border)] rounded p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-info)]">
          Phosphor Icons (Duotone Weight)
        </h2>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Icon name="Robot" source="phosphor" weight="duotone" size={32} />
            <span className="text-xs">Robot Duotone</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Brain" source="phosphor" weight="duotone" size={32} />
            <span className="text-xs">Brain Duotone</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Lightning" source="phosphor" weight="duotone" size={32} className="text-[var(--color-primary)]" />
            <span className="text-xs">Lightning</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Gear" source="phosphor" weight="duotone" size={32} />
            <span className="text-xs">Gear</span>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="border border-[var(--color-border)] rounded p-4 bg-[var(--color-background-secondary)]">
        <h2 className="text-lg font-bold mb-4">Usage Examples</h2>
        <pre className="text-xs bg-[var(--color-background)] p-4 rounded overflow-x-auto">
{`// Lucide icon (default, line style)
<Icon name="Settings" size={24} />
<Icon name="Home" source="lucide" />

// Phosphor icon with different weights
<Icon name="Robot" source="phosphor" weight="regular" />
<Icon name="Heart" source="phosphor" weight="fill" />
<Icon name="Brain" source="phosphor" weight="duotone" />

// With custom styling
<Icon 
  name="Zap" 
  size={32} 
  className="text-primary" 
/>

// Design system import
import { Icon } from '../design-system/Icon';`}
        </pre>
      </section>
    </div>
  );
}