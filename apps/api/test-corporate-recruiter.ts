#!/usr/bin/env node
/**
 * Test script for the Corporate Recruiter (onboardProject)
 * 
 * This script demonstrates how the Corporate Recruiter scans a project,
 * identifies departments based on package.json dependencies, and creates
 * specialized roles with tech-stack-specific prompts.
 */

import { PrismaClient } from '@prisma/client';
import { onboardProject } from './src/services/RoleIngestionService.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Corporate Recruiter Test\n');
  console.log('This will scan the monorepo and automatically create roles based on detected tech stacks.\n');

  // Use the monorepo root as the target
  const rootPath = path.join(__dirname, '../..');
  
  console.log(`Target directory: ${rootPath}\n`);
  console.log('─'.repeat(80));
  
  try {
    const stats = await onboardProject(rootPath, prisma);
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n📈 Final Results:');
    console.log(`   ✓ Package.json files scanned: ${stats.scanned}`);
    console.log(`   ✓ Departments identified: ${stats.departments}`);
    console.log(`   ✓ Roles created: ${stats.rolesCreated}`);
    console.log(`   ✓ Roles updated: ${stats.rolesUpdated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }
    
    // Display the created roles
    console.log('\n📋 Checking created roles...\n');
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { name: 'Frontend Lead' },
          { name: 'Backend Architect' },
        ],
      },
      include: {
        category: true,
      },
    });
    
    for (const role of roles) {
      console.log(`\n🎭 Role: ${role.name}`);
      console.log(`   Category: ${role.category?.name || 'N/A'}`);
      console.log(`   Tools: ${role.tools.join(', ')}`);
      console.log(`   Description: ${role.description || 'N/A'}`);
      
      // Show a snippet of the system prompt
      const promptSnippet = role.basePrompt.substring(0, 200);
      console.log(`   System Prompt (first 200 chars):`);
      console.log(`   ${promptSnippet}...`);
    }
    
    console.log('\n✅ Test complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
