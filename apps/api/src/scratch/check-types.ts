import { Prisma } from '@prisma/client';

type CreateInput = Prisma.ProviderConfigCreateInput;
type UpdateInput = Prisma.ProviderConfigUpdateInput;

const check: CreateInput = {
    id: 'test',
    label: 'test',
    type: 'test',
    apiKeyEnvVar: 'test',
    status: 'ACTIVE',
    lastError: 'test'
};

console.log('Type check passed!');
