import React from 'react';
import LegacyWorkspace from '../../legacy/unused/workspace/WorkSpace.js';

// Thin wrapper kept for now so routes don't change,
// but always serve the main Workspace UI (COORP is future-only).
export default function FeatureFlagWrapper() {
  return <LegacyWorkspace />;
}
