import { PrismaClient } from '@prisma/client';

// This assumes your prisma client is instantiated here or in a context
const prisma = new PrismaClient();

export class ModelService {
  /**
   * Creates or updates a ModelConfig in the database.
   * This function correctly handles the nested creation of
   * provider data.
   */
  async saveNormalizedModel(modelData: any) {
    // 1. Destructure all top-level and nested fields
    const {
      id,
      name,
      description,
      context_length,
      created,
      supported_parameters,
      default_parameters,
      per_request_limits,
      canonical_slug,
      hugging_face_id,
      architecture, // Nested object
      pricing,      // Nested object
      topProvider   // Nested object
    } = modelData;

    // Convert timestamp if necessary
    const createdDate = new Date(created * 1000);

    // 2. Perform the upsert
    try {
      const result = await prisma.modelConfig.upsert({
        //
        // THIS IS THE FIX:
        // The 'where' clause MUST use the unique @id field.
        //
        where: {
          id: id
        },

        // --- UPDATE (if model ID exists) ---
        update: {
          createdAt: createdDate,
          provider: {
            update: topProvider,
          }
        },

        // --- CREATE (if model ID does not exist) ---
        create: {
          id,
          createdAt: createdDate,
          model: name,
          provider: {
            create: topProvider,
          }
        }
      });
      console.log(`Successfully upserted model: ${id}`);
      return result;
    } catch (error: any) {
      console.error(`Prisma upsert failed for model ${id}:`, error.message);
      throw new Error(`Failed to save model ${id}: ${error.message}`);
    }
  }
}