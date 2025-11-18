import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ModelService {
async saveNormalizedModel(modelData: any) {
const { id, architecture, pricing, topProvider, ...rest } = modelData;
const createdDate = new Date(modelData.created * 1000);

try {
const result = await prisma.modelConfig.upsert({
where: { id: id }, // FIX: Use 'id', not 'modelId_providerId'
update: {
...rest,
created: createdDate,
architecture: { update: architecture },
pricing: { update: pricing },
topProvider: { update: topProvider }
},
create: {
id,
...rest,
created: createdDate,
architecture: { create: architecture },
pricing: { create: pricing },
topProvider: { create: topProvider }
}
});
return result;
} catch (error: any) {
throw new Error(`Failed to save model ${id}: ${error.message}`);
}
}
}