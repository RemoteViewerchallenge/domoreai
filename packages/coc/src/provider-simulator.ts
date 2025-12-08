// Simple provider simulator for rate-limits + billing based on apps/api/latest_models/models.json
import fs from 'fs';
import path from 'path';

interface ProviderInfo {
  name: string;
  provider: string;
  is_free: boolean;
  free_tier_per_min?: number;
  rpm_price_cents?: number;
  burst?: number;
  context_window?: number;
}

interface ProviderUsage {
  callCount: number;
  lastMinuteCalls: number[];
  lastResetMs: number;
  totalChargeCents: number;
}

interface ProviderResult {
  error?: 'rate_limited' | 'provider_error';
  retryAfterSeconds?: number;
  result?: any;
  provider?: string;
  billed?: boolean;
  chargeCents?: number;
}

const providerUsage = new Map<string, ProviderUsage>();
const providerInfo = new Map<string, ProviderInfo>();
let billingLog: any[] = [];

const USAGE_FILE = path.join(process.cwd(), 'out', 'provider_usage.json');
const BILLING_FILE = path.join(process.cwd(), 'out', 'provider_billing.json');
const MODELS_FILE = path.join(process.cwd(), '..', '..', 'apps', 'api', 'latest_models', 'models.json');

function loadProviderInfo() {
  try {
    if (!fs.existsSync(MODELS_FILE)) {
      console.warn(`[ProviderSimulator] Models file not found: ${MODELS_FILE}`);
      return;
    }
    
    const raw = fs.readFileSync(MODELS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const models = Array.isArray(data) ? data : data.models || [];
    
    for (const model of models) {
      const providerName = model.provider || 'unknown';
      
      if (!providerInfo.has(providerName)) {
        providerInfo.set(providerName, {
          name: providerName,
          provider: providerName,
          is_free: model.is_free || false,
          free_tier_per_min: model.is_free ? 60 : 10,
          rpm_price_cents: model.is_free ? 0 : 5,
          burst: 2,
          context_window: model.context_window
        });
      }
    }
    
    console.log(`[ProviderSimulator] Loaded ${providerInfo.size} providers`);
  } catch (error) {
    console.error('[ProviderSimulator] Failed to load provider info:', error);
  }
}

function loadUsage() {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const raw = fs.readFileSync(USAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      
      for (const [provider, usage] of Object.entries(data)) {
        providerUsage.set(provider, usage as ProviderUsage);
      }
    }
  } catch (error) {
    console.error('[ProviderSimulator] Failed to load usage:', error);
  }
}

function saveUsage() {
  try {
    const dir = path.dirname(USAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = Object.fromEntries(providerUsage.entries());
    fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[ProviderSimulator] Failed to save usage:', error);
  }
}

function saveBilling() {
  try {
    const dir = path.dirname(BILLING_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(BILLING_FILE, JSON.stringify(billingLog, null, 2));
  } catch (error) {
    console.error('[ProviderSimulator] Failed to save billing:', error);
  }
}

function getUsage(providerName: string): ProviderUsage {
  if (!providerUsage.has(providerName)) {
    providerUsage.set(providerName, {
      callCount: 0,
      lastMinuteCalls: [],
      lastResetMs: Date.now(),
      totalChargeCents: 0
    });
  }
  return providerUsage.get(providerName)!;
}

function checkRateLimit(providerName: string): { limited: boolean; retryAfter?: number } {
  const info = providerInfo.get(providerName);
  if (!info) {
    console.warn(`[ProviderSimulator] Unknown provider: ${providerName}`);
    return { limited: false };
  }
  
  const usage = getUsage(providerName);
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  usage.lastMinuteCalls = usage.lastMinuteCalls.filter(t => t > oneMinuteAgo);
  
  const freeTier = info.free_tier_per_min || 10;
  const burst = info.burst || 0;
  const limit = freeTier + burst;
  
  if (usage.lastMinuteCalls.length >= limit) {
    const oldestCall = Math.min(...usage.lastMinuteCalls);
    const retryAfter = Math.ceil((60000 - (now - oldestCall)) / 1000);
    return { limited: true, retryAfter };
  }
  
  return { limited: false };
}

function recordCall(providerName: string): { billed: boolean; chargeCents: number } {
  const info = providerInfo.get(providerName);
  const usage = getUsage(providerName);
  const now = Date.now();
  
  usage.callCount++;
  usage.lastMinuteCalls.push(now);
  
  let chargeCents = 0;
  let billed = false;
  
  if (info && !info.is_free) {
    const freeTier = info.free_tier_per_min || 10;
    const oneMinuteAgo = now - 60000;
    const callsThisMinute = usage.lastMinuteCalls.filter(t => t > oneMinuteAgo).length;
    
    if (callsThisMinute > freeTier) {
      chargeCents = info.rpm_price_cents || 5;
      usage.totalChargeCents += chargeCents;
      billed = true;
      
      billingLog.push({
        timestamp: new Date().toISOString(),
        provider: providerName,
        chargeCents,
        callsThisMinute,
        freeTier,
        totalCharged: usage.totalChargeCents
      });
    }
  }
  
  saveUsage();
  if (billed) {
    saveBilling();
  }
  
  return { billed, chargeCents };
}

export async function callModel(
  providerName: string,
  callerFn: () => Promise<any>,
  opts?: { taskId?: string }
): Promise<ProviderResult> {
  const rateCheck = checkRateLimit(providerName);
  if (rateCheck.limited) {
    console.warn(`[ProviderSimulator] Rate limited: ${providerName}, retry after ${rateCheck.retryAfter}s`);
    return {
      error: 'rate_limited',
      retryAfterSeconds: rateCheck.retryAfter,
      provider: providerName
    };
  }
  
  try {
    const result = await callerFn();
    const billing = recordCall(providerName);
    
    if (billing.billed) {
      console.log(`[ProviderSimulator] Billed ${billing.chargeCents}¢ for ${providerName}`);
    }
    
    return {
      result,
      provider: providerName,
      billed: billing.billed,
      chargeCents: billing.chargeCents
    };
  } catch (error) {
    console.error(`[ProviderSimulator] Provider error for ${providerName}:`, error);
    return {
      error: 'provider_error',
      provider: providerName
    };
  }
}

export function getProviderStatus() {
  const status: Record<string, any> = {};
  
  for (const [name, info] of providerInfo.entries()) {
    const usage = getUsage(name);
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const callsThisMinute = usage.lastMinuteCalls.filter(t => t > oneMinuteAgo).length;
    
    status[name] = {
      provider: name,
      is_free: info.is_free,
      free_tier_per_min: info.free_tier_per_min,
      callsThisMinute,
      totalCalls: usage.callCount,
      totalChargeCents: usage.totalChargeCents,
      limited: callsThisMinute >= (info.free_tier_per_min || 10) + (info.burst || 0)
    };
  }
  
  return status;
}

export function resetUsage(providerName?: string) {
  if (providerName) {
    providerUsage.delete(providerName);
  } else {
    providerUsage.clear();
    billingLog = [];
  }
  saveUsage();
  saveBilling();
}

loadProviderInfo();
loadUsage();