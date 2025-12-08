#!/usr/bin/env ts-node
/**
 * Test script for real API calls with rate limit tracking
 * 
 * Usage:
 *   ts-node test-real-api.ts
 */

// Load environment first
import './src/config';
import { makeAPICall } from './src/api-client';
import { getRateLimitStatus, getUsageSummary } from './src/rate-limit-tracker';

async function testRealAPI() {
  console.log('🧪 Testing Real API Calls with Rate Limit Tracking\n');
  console.log(`Environment check:`);
  console.log(`- MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  // Test 1: Mistral call
  if (process.env.MISTRAL_API_KEY) {
    console.log('Test 1: Mistral API Call');
    try {
      const result = await makeAPICall({
        provider: 'mistral',
        modelId: 'mistral-small-latest',
        prompt: 'Say hello in exactly 3 words',
        maxTokens: 50,
      });
      console.log('✅ Response:', result.content.substring(0, 100));
      console.log('📊 Headers captured:', Object.keys(result.headers).filter(k => k.includes('rate')).join(', '));
      
      // Check rate limit status
      const status = await getRateLimitStatus('mistral', 'mistral-small-latest');
      if (status) {
        console.log(`📈 Rate Limit: ${status.remaining}/${status.limit} remaining\n`);
      }
    } catch (error: any) {
      const status = error.status || error.response?.status;
      if (status === 401 || status === 403) {
        console.error('❌ Mistral test failed: Invalid/expired API key\n');
      } else {
        console.error(`❌ Mistral test failed: ${error.message}\n`);
      }
    }
  } else {
    console.log('⏭️  Skipping Mistral (no API key)\n');
  }

  // Test 2: Groq call
  if (process.env.GROQ_API_KEY) {
    console.log('Test 2: Groq API Call');
    try {
      const result = await makeAPICall({
        provider: 'groq',
        modelId: 'llama-3.3-70b-versatile',
        prompt: 'What is 2+2? Answer in one word.',
        maxTokens: 10,
      });
      console.log('✅ Response:', result.content.substring(0, 100));
      console.log('📊 Headers captured:', Object.keys(result.headers).filter(k => k.includes('rate')).join(', '));
      
      const status = await getRateLimitStatus('groq', 'llama-3.3-70b-versatile');
      if (status) {
        console.log(`📈 Rate Limit: ${status.remaining}/${status.limit} remaining\n`);
      }
    } catch (error: any) {
      console.error('❌ Groq test failed:', error.message, '\n');
    }
  } else {
    console.log('⏭️  Skipping Groq (no API key)\n');
  }

  // Test 3: Usage summary
  console.log('Test 3: Usage Summary');
  const summary = await getUsageSummary();
  console.log(`📊 Total Calls: ${summary.totalCalls}`);
  console.log(`📊 Models Tracked: ${summary.totalModels}`);
  console.log(`✅ Active Models: ${summary.activeModels}`);
  console.log(`🚫 Throttled Models: ${summary.throttledModels}`);

  console.log('\n✅ All tests complete!');
}

testRealAPI().catch(console.error);
