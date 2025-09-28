#!/usr/bin/env tsx
/**
 * Simple diagnostic script to test the repair functionality
 */

import { DeepSeekClient } from '../lib/api/deepseek/client';

async function testDeepSeekAPI() {
  console.log('🔍 Testing DeepSeek API Connection...\n');

  try {
    // Check environment variables
    console.log('Environment check:');
    console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('DEEPSEEK_API_URL:', process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com');

    // Initialize client with config
    const client = new DeepSeekClient({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      apiEndpoint: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
      maxRetries: 3,
      timeout: 30000
    });

    // Test simple API call
    console.log('\n📡 Making test API call...');
    const response = await client.chat({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Reply with "OK" if you receive this message.' }
      ],
      temperature: 0
    });

    console.log('✅ API Response received:');
    console.log('Content:', response.choices?.[0]?.message?.content);
    console.log('Model:', response.model);
    console.log('Usage:', response.usage);

  } catch (error: any) {
    console.error('❌ API Test failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function testRepairFlow() {
  console.log('\n\n🔧 Testing Repair Flow...\n');

  try {
    // Import the revision executive
    const { RevisionExecutive } = await import('../lib/agents/revision-executive');

    // Create a test error
    const testError = {
      type: 'character_consistency' as const,
      severity: 'high' as const,
      location: { page: 1, line: 5, scene: 1 },
      description: 'Character Mary calls John by the wrong name (Tom)',
      suggestion: 'Change "Tom" to "John" in Mary\'s dialogue',
      confidence: 0.85,
      context: {
        before: 'JOHN walks into the coffee shop.',
        error: 'MARY: Good morning, Tom!',
        after: 'JOHN: Good morning, Mary.'
      }
    };

    console.log('Test error created:', testError.description);

    // Try to generate a fix
    console.log('\n📝 Attempting to generate fix...');
    const revisionExecutive = new RevisionExecutive();

    // Check if the generateFix method exists
    if (typeof revisionExecutive.generateFix === 'function') {
      const fix = await revisionExecutive.generateFix(testError);
      console.log('✅ Fix generated successfully:');
      console.log('Fix content:', fix);
    } else {
      console.error('❌ generateFix method not found on RevisionExecutive');
      console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(revisionExecutive)));
    }

  } catch (error: any) {
    console.error('❌ Repair flow test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function main() {
  console.log('==================================');
  console.log('  ScriptAI Repair Diagnosis Tool');
  console.log('==================================\n');

  await testDeepSeekAPI();
  await testRepairFlow();

  console.log('\n==================================');
  console.log('  Diagnosis Complete');
  console.log('==================================');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
