import React from 'react';
import LegacyWorkspace from '../pages/WorkSpace.js';
import NewCOORP from '../pages/COORP.js';

const featureFlagKey = 'feature_new_coorp_enabled';

/**
 * FeatureFlagWrapper component that conditionally renders
 * the new COORP page or the legacy WorkSpace based on a feature flag.
 * 
 * Feature flag can be set via:
 * 1. Environment variable: VITE_ENABLE_NEW_COORP=true
 * 2. localStorage: feature_new_coorp_enabled=true
 * 
 * localStorage takes precedence over env var for easy testing.
 */
export default function FeatureFlagWrapper() {
  // Allow enabling via env fallback or localStorage toggle during rollout.
  const enabled = (() => {
    if (typeof window === 'undefined') return false;
    
    const env = import.meta.env.VITE_ENABLE_NEW_COORP === 'true';
    const ls = localStorage.getItem(featureFlagKey);
    
    if (ls !== null) return ls === 'true';
    return env;
  })();

  if (enabled) {
    return <NewCOORP />;
  }
  
  // default to legacy to avoid breaking anything
  return <LegacyWorkspace />;
}
