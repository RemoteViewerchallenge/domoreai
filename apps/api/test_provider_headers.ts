#!/usr/bin/env tsx
/**
 * Test script to collect HTTP headers from all provider API calls
 * This helps understand authentication patterns and response metadata
 */

import 'dotenv/config';
import { ProviderFactory } from './src/utils/ProviderFactory.js';
import { decrypt } from './src/utils/encryption.js';
import { db } from './src/db.js';
import { providerConfigs } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

interface HeaderCollectionResult {
  providerId: string;
  providerLabel: string;
  providerType: string;
  timestamp: string;
  success: boolean;
  error?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
  modelCount?: number;
}

// Intercept fetch to capture headers
const originalFetch = global.fetch;
const capturedRequests: Map<string, { reqHeaders: Headers; resHeaders: Headers; status: number }> = new Map();

function setupFetchInterceptor() {
  global.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    
    // Capture request headers
    const reqHeaders = new Headers(init?.headers || {});
    
    try {
      const response = await originalFetch(input, init);
      
      // Capture response headers
      capturedRequests.set(url, {
        reqHeaders,
        resHeaders: response.headers,
        status: response.status
      });
      
      return response;
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      throw error;
    }
  };
}

function restoreFetch() {
  global.fetch = originalFetch;
}

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    // Redact sensitive values
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('key')) {
      obj[key] = '[REDACTED]';
    } else {
      obj[key] = value;
    }
  });
  return obj;
}

async function testProvider(config: any): Promise<HeaderCollectionResult> {
  const result: HeaderCollectionResult = {
    providerId: config.id,
    providerLabel: config.label,
    providerType: config.type,
    timestamp: new Date().toISOString(),
    success: false,
  };

  try {
    // Decrypt API key
    const apiKey = decrypt(config.apiKey);
    
    // Create provider instance
    const provider = ProviderFactory.createProvider(config.type, {
      id: config.id,
      apiKey,
      baseURL: config.baseURL || undefined,
    });

    console.log(`\n📡 Testing: ${config.label} (${config.type})`);
    
    // Clear previous captures
    capturedRequests.clear();
    
    // Call getModels to trigger API request
    const models = await provider.getModels();
    
    result.modelCount = models.length;
    result.success = true;
    
    // Extract captured headers from the most recent request
    const captures = Array.from(capturedRequests.values());
    if (captures.length > 0) {
      const lastCapture = captures[captures.length - 1];
      result.requestHeaders = headersToObject(lastCapture.reqHeaders);
      result.responseHeaders = headersToObject(lastCapture.resHeaders);
      result.statusCode = lastCapture.status;
    }
    
    console.log(`   ✅ Success: ${models.length} models found`);
    console.log(`   📥 Request Headers:`, Object.keys(result.requestHeaders || {}).join(', '));
    console.log(`   📤 Response Headers:`, Object.keys(result.responseHeaders || {}).join(', '));
    
  } catch (error: any) {
    result.error = error.message;
    console.log(`   ❌ Failed:`, error.message);
  }

  return result;
}

async function main() {
  console.log('🚀 Provider Header Collection Test\n');
  console.log('=' .repeat(60));
  
  setupFetchInterceptor();
  
  try {
    // Load all enabled providers from database
    const configs = await db.select().from(providerConfigs).where(eq(providerConfigs.isEnabled, true));
    
    console.log(`\nFound ${configs.length} enabled providers\n`);
    
    const results: HeaderCollectionResult[] = [];
    
    // Test each provider
    for (const config of configs) {
      const result = await testProvider(config);
      results.push(result);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY\n');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
    
    if (failed.length > 0) {
      console.log('Failed Providers:');
      failed.forEach(r => {
        console.log(`  - ${r.providerLabel}: ${r.error}`);
      });
      console.log();
    }
    
    // Write detailed results to JSON file
    const outputPath = './provider_header_results.json';
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\n💾 Detailed results saved to: ${outputPath}`);
    
    // Print interesting header patterns
    console.log('\n📋 Common Header Patterns:\n');
    
    const allRequestHeaders = new Set<string>();
    const allResponseHeaders = new Set<string>();
    
    results.forEach(r => {
      if (r.requestHeaders) Object.keys(r.requestHeaders).forEach(h => allRequestHeaders.add(h));
      if (r.responseHeaders) Object.keys(r.responseHeaders).forEach(h => allResponseHeaders.add(h));
    });
    
    console.log('Request Headers Used:');
    Array.from(allRequestHeaders).sort().forEach(h => console.log(`  - ${h}`));
    
    console.log('\nResponse Headers Received:');
    Array.from(allResponseHeaders).sort().forEach(h => console.log(`  - ${h}`));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    restoreFetch();
  }
  
  console.log('\n✨ Test complete!\n');
}

main();
