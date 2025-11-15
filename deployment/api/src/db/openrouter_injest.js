import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This is the raw JSON data you get from OpenRouter
// In a real script, you would fetch this from the API
const openRouterData = [
  /* Paste the full JSON array from https://openrouter.ai/api/v1/models here */
  {
    "id": "openai/gpt-3.5-turbo",
    "name": "OpenAI: GPT-3.5 Turbo",
    "description": "GPT-3.5 Turbo is OpenAI's fastest model...",
    "created": 1685232000,
    "context_length": 16385,
    "pricing": { "prompt": "0.0000005", "completion": "0.0000015", "request": "0", "image": "0" },
    // ... more fields
    "default_parameters": {}
  },
  {
    "id": "mistralai/mistral-7b-instruct:free",
    "name": "Mistral: Mistral 7B Instruct (free)",
    "description": "A high-performing, industry-standard 7.3B parameter model...",
    "created": 1716768000,
    "context_length": 32768,
    "pricing": { "prompt": "0", "completion": "0", "request": "0", "image": "0" },
    // ... more fields
    "default_parameters": {}
  },
  // ... more models
];

async function main() {
  console.log('Starting ingestion for FREE models only...');

  for (const model of openRouterData) {

    // --- START: Free Model Filter ---
    // Check if the model is free based on its ID (a good heuristic).
    const isFreeById = model.id.endsWith(':free');

    // Check if the model is free based on its pricing object.
    const isFreeByPrice = model.pricing &&
                          model.pricing.prompt === '0' &&
                          model.pricing.completion === '0' &&
                          (model.pricing.request === '0' || !model.pricing.request) &&
                          (model.pricing.image === '0' || !model.pricing.image);

    // If the model is not free by EITHER the ID or the price, skip it.
    if (!isFreeById && !isFreeByPrice) {
      // console.log(`Skipping non-free model: ${model.name}`);
      continue; // Skips to the next model in the loop
    }
    // --- END: Free Model Filter ---
    
    console.log(`Ingesting FREE model: ${model.name}`);
    
    // Convert Unix timestamp (seconds) to JavaScript Date (milliseconds)
    const createdDate = new Date(model.created * 1000);

    // Use Prisma's "upsert" to create or update the model.
    // This prevents creating duplicate entries if you run the script again.
    try {
      await prisma.modelConfig.upsert({
        where: { id: model.id },
        update: {
          // Define what to update if the model already exists
          name: model.name,
          description: model.description,
          context_length: model.context_length,
          canonical_slug: model.canonical_slug,
          hugging_face_id: model.hugging_face_id,
          created: createdDate,
          supported_parameters: model.supported_parameters || [],
          default_parameters: model.default_parameters || {},
          per_request_limits: model.per_request_limits || {},
          // For relations, you might want to update them as well
          architecture: {
            update: {
              modality: model.architecture?.modality,
              input_modalities: model.architecture?.input_modalities || [],
              output_modalities: model.architecture?.output_modalities || [],
              tokenizer: model.architecture?.tokenizer,
              instruct_type: model.architecture?.instruct_type,
            }
          },
          pricing: {
            update: {
              prompt: model.pricing?.prompt ?? '0',
              completion: model.pricing?.completion ?? '0',
              request: model.pricing?.request,
              image: model.pricing?.image,
              web_search: model.pricing?.web_search,
              internal_reasoning: model.pricing?.internal_reasoning,
            }
          },
          topProvider: {
            update: {
              context_length: model.top_provider?.context_length,
              max_completion_tokens: model.top_provider?.max_completion_tokens,
              is_moderated: model.top_provider?.is_moderated,
            }
          }
        },
        create: {
          // Define how to create a new model record
          id: model.id,
          name: model.name,
          description: model.description,
          context_length: model.context_length,
          canonical_slug: model.canonical_slug,
          hugging_face_id: model.hugging_face_id,
          created: createdDate,
          supported_parameters: model.supported_parameters || [],
          default_parameters: model.default_parameters || {},
          per_request_limits: model.per_request_limits || {},
          
          // Create the related records for the nested objects
          architecture: model.architecture ? {
            create: {
              modality: model.architecture.modality,
              input_modalities: model.architecture.input_modalities || [],
              output_modalities: model.architecture.output_modalities || [],
              tokenizer: model.architecture.tokenizer,
              instruct_type: model.architecture.instruct_type,
            }
          } : undefined,

          pricing: model.pricing ? {
            create: {
              prompt: model.pricing.prompt ?? '0',
              completion: model.pricing.completion ?? '0',
              request: model.pricing.request,
              image: model.pricing.image,
              web_search: model.pricing.web_search,
              internal_reasoning: model.pricing.internal_reasoning,
            }
          } : undefined,

          topProvider: model.top_provider ? {
            create: {
              context_length: model.top_provider.context_length,
              max_completion_tokens: model.top_provider.max_completion_tokens,
              is_moderated: model.top_provider.is_moderated,
            }
          } : undefined,
        },
      });
    } catch (error) {
      console.error(`Failed to ingest model ${model.name}:`, error);
    }
  }

  console.log('Ingestion complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
