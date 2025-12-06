
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define category mappings
const categoryMap: Record<string, string[]> = {
  'Executive & Leadership': [
    'Ceo', 'chief-executive-officer', 'chief-operating-officer', 'chief-financial-officer', 
    'chief-technology-officer', 'chief-product-officer', 'chief-marketing-officer', 
    'chief-human-resources-officer', 'chief-data-officer', 'chief-information-officer',
    'creative-director', 'communications-director', 'controller', 'financial-controller'
  ],
  'Engineering & Development': [
    'architect', 'engineer', 'backend-developer', 'backend-engineer', 'frontend-developer', 
    'full-stack-developer', 'software-engineer', 'devops-engineer', 'site-reliability-engineer',
    'cloud-architect', 'solution-architect', 'tech-lead', 'embedded-systems-engineer',
    'game-developer', 'mobile-developer', 'blockchain-developer', 'database-administrator',
    'network-engineer', 'security-engineer', 'qa-engineer', 'qa_specialist', 'quality-engineer',
    'r-and-d-engineer', 'process-engineer', 'environmental-engineer', 'patent-engineer',
    'bi-developer', 'data-engineer', 'machine-learning-engineer', 'ai-researcher'
  ],
  'Product & Design': [
    'product-manager', 'product-owner', 'product-designer', 'design-lead', 'ui-designer', 
    'ux-designer', 'ux-researcher', 'interaction-designer', 'motion-designer', 'graphic-designer',
    'instructional-designer', 'video-producer'
  ],
  'Data & Analytics': [
    'data-scientist', 'data-analyst', 'business-analyst', 'business-intelligence-analyst',
    'financial-analyst', 'marketing-analyst', 'healthcare-analyst', 'real-estate-analyst',
    'budget-analyst', 'credit-analyst', 'investment-analyst', 'research-scientist',
    'clinical-researcher', 'health-informatics'
  ],
  'Marketing & Sales': [
    'marketing-manager', 'digital-marketing-specialist', 'digital-marketer', 'content-marketer',
    'content-marketing-manager', 'growth-marketing-manager', 'growth-hacker', 'brand-manager',
    'social-media-manager', 'seo-specialist', 'copywriter', 'content-creator', 'pr-manager',
    'public-relations-manager', 'sales-manager', 'sales-engineer', 'account-manager',
    'customer-success-manager', 'customer-service-manager', 'business-development-manager',
    'business-developer', 'partnership-manager', 'pre-sales-consultant'
  ],
  'Operations & Management': [
    'operations-manager', 'project-manager', 'program-manager', 'technical-pm', 'scrum-master',
    'agile-coach', 'change-manager', 'change-management-specialist', 'risk-manager',
    'compliance-manager', 'compliance-officer', 'quality-assurance-manager', 'contract-manager',
    'procurement-manager', 'procurement-specialist', 'supply-chain-manager', 'facilities-manager',
    'facility-manager', 'office-manager', 'executive-assistant', 'business-process-analyst',
    'implementation-consultant', 'strategy-consultant', 'innovation-manager', 'sustainability-manager',
    'production-manager'
  ],
  'HR & Admin': [
    'hr-manager', 'talent-acquisition', 'talent-acquisition-specialist', 'learning-development',
    'learning-development-manager', 'training-specialist', 'corporate-trainer', 'curriculum-developer',
    'organizational-developer', 'organizational-development-manager', 'diversity-inclusion',
    'diversity-inclusion-manager', 'compensation-benefits', 'compensation-benefits-manager',
    'payroll-manager'
  ],
  'Finance & Legal': [
    'accountant', 'accounting-manager', 'tax-manager', 'treasury-manager', 'internal-auditor',
    'legal-counsel', 'privacy-officer', 'investor-relations', 'investor-relations-manager'
  ],
  'IT & Support': [
    'it-administrator', 'help-desk-specialist', 'technical-support', 'technical-support-engineer',
    'technical-writer', 'medical-writer'
  ],
  'System Agents': [
    'role orchestrator', 'short lived agent', 'sql-query-helper'
  ]
};

async function categorizeRoles() {
  console.log('Starting Role Categorization...');

  try {
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles to process.`);

    for (const role of roles) {
      let newCategory = 'Uncategorized';
      const normalizedName = role.name.toLowerCase().trim();

      // Find matching category
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(k => normalizedName === k.toLowerCase() || normalizedName.includes(k.toLowerCase()))) {
          newCategory = category;
          break;
        }
      }

      // Update Role
      await prisma.role.update({
        where: { id: role.id },
        data: {
          category: newCategory,
          minContext: 30000, // Set minContext to 30000 as requested
          // Ensure maxContext is still high enough
          maxContext: role.maxContext && role.maxContext > 30000 ? role.maxContext : 128000
        }
      });
      
      // console.log(`Updated ${role.name} -> ${newCategory}`);
    }

    console.log('All roles categorized and updated successfully.');

  } catch (error) {
    console.error('Error updating roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

categorizeRoles();
