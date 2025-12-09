#!/usr/bin/env node
/**
 * Simple header collection test - makes real API calls to collect headers
 */

import 'dotenv/config';

interface HeaderResult {
  provider: string;
  success: boolean;
  error?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  statusCode?: number;
}

function redact(key: string, value: string): string {
  const sensitiveKeys = ['authorization', 'api-key', 'x-api-key', 'apikey'];
  if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
    return '[REDACTED]';
  }
  return value;
}

async function testGoogle(): Promise<HeaderResult> {
  const result: HeaderResult = {
    provider: 'Google (Gemini)',
    success: false,
    requestHeaders: {},
    responseHeaders: {}
  };

  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('No API key');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const reqHeaders = {
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { headers: reqHeaders });
    
    result.statusCode = response.status;
    result.requestHeaders = Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k, redact(k, v)])
    );
    
    response.headers.forEach((value, key) => {
      result.responseHeaders[key] = redact(key, value);
    });
    
    result.success = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function testGroq(): Promise<HeaderResult> {
  const result: HeaderResult = {
    provider: 'Groq',
    success: false,
    requestHeaders: {},
    responseHeaders: {}
  };

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('No API key');

    const url = 'https://api.groq.com/openai/v1/models';
    
    const reqHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { headers: reqHeaders });
    
    result.statusCode = response.status;
    result.requestHeaders = Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k, redact(k, v)])
    );
    
    response.headers.forEach((value, key) => {
      result.responseHeaders[key] = redact(key, value);
    });
    
    result.success = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function testMistral(): Promise<HeaderResult> {
  const result: HeaderResult = {
    provider: 'Mistral',
    success: false,
    requestHeaders: {},
    responseHeaders: {}
  };

  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error('No API key');

    const url = 'https://api.mistral.ai/v1/models';
    
    const reqHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { headers: reqHeaders });
    
    result.statusCode = response.status;
    result.requestHeaders = Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k, redact(k, v)])
    );
    
    response.headers.forEach((value, key) => {
      result.responseHeaders[key] = redact(key, value);
    });
    
    result.success = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function testOpenRouter(): Promise<HeaderResult> {
  const result: HeaderResult = {
    provider: 'OpenRouter',
    success: false,
    requestHeaders: {},
    responseHeaders: {}
  };

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('No API key');

    const url = 'https://openrouter.ai/api/v1/models';
    
    const reqHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'C.O.R.E. Test'
    };
    
    const response = await fetch(url, { headers: reqHeaders });
    
    result.statusCode = response.status;
    result.requestHeaders = Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k, redact(k, v)])
    );
    
    response.headers.forEach((value, key) => {
      result.responseHeaders[key] = redact(key, value);
    });
    
    result.success = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function testOllama(): Promise<HeaderResult> {
  const result: HeaderResult = {
    provider: 'Ollama (Local)',
    success: false,
    requestHeaders: {},
    responseHeaders: {}
  };

  try {
    const url = 'http://127.0.0.1:11434/api/tags';
    
    const reqHeaders = {
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { headers: reqHeaders });
    
    result.statusCode = response.status;
    result.requestHeaders = reqHeaders;
    
    response.headers.forEach((value, key) => {
      result.responseHeaders[key] = value;
    });
    
    result.success = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function main() {
  console.log('🧪 Testing Provider API Calls & Header Collection\n');
  console.log('='.repeat(70));
  
  const tests = [
    { name: 'Google', fn: testGoogle },
    { name: 'Groq', fn: testGroq },
    { name: 'Mistral', fn: testMistral },
    { name: 'OpenRouter', fn: testOpenRouter },
    { name: 'Ollama', fn: testOllama }
  ];
  
  const results: HeaderResult[] = [];
  
  for (const test of tests) {
    console.log(`\n📡 Testing ${test.name}...`);
    const result = await test.fn();
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Success (${result.statusCode})`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    console.log(`   📥 Request Headers: ${Object.keys(result.requestHeaders).join(', ')}`);
    console.log(`   📤 Response Headers: ${Object.keys(result.responseHeaders).join(', ')}`);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY\n');
  
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successful}/${results.length}\n`);
  
  // Collect all unique headers
  console.log('📋 Header Analysis:\n');
  
  const allRequestHeaders = new Set<string>();
  const allResponseHeaders = new Set<string>();
  
  results.forEach(r => {
    Object.keys(r.requestHeaders).forEach(h => allRequestHeaders.add(h));
    Object.keys(r.responseHeaders).forEach(h => allResponseHeaders.add(h));
  });
  
  console.log('Request Headers Sent:');
  Array.from(allRequestHeaders).sort().forEach(h => {
    const providers = results
      .filter(r => h in r.requestHeaders)
      .map(r => r.provider)
      .join(', ');
    console.log(`  ${h.padEnd(25)} → ${providers}`);
  });
  
  console.log('\nResponse Headers Received:');
  Array.from(allResponseHeaders).sort().forEach(h => {
    const providers = results
      .filter(r => h in r.responseHeaders)
      .map(r => r.provider)
      .join(', ');
    console.log(`  ${h.padEnd(25)} → ${providers}`);
  });
  
  // Rate limit headers
  console.log('\n🚦 Rate Limit Headers Found:\n');
  const rateLimitHeaders = ['x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests', 
    'x-ratelimit-reset-requests', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens',
    'retry-after', 'x-daily-limit', 'x-daily-requests-left'];
  
  results.forEach(r => {
    const found = Object.keys(r.responseHeaders).filter(h => 
      rateLimitHeaders.some(rl => h.toLowerCase().includes(rl.toLowerCase()))
    );
    if (found.length > 0) {
      console.log(`${r.provider}:`);
      found.forEach(h => {
        console.log(`  ${h}: ${r.responseHeaders[h]}`);
      });
    }
  });
  
  // Save full results
  const fs = await import('fs/promises');
  await fs.writeFile(
    './header_test_results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n💾 Full results saved to: header_test_results.json\n');
}

main().catch(console.error);
