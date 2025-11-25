backend development
Custom Gem
To give you Visual Assurance that your "Governor" (Redis) and "Safety Net" are working, we need to expose the invisible Redis layer to your UI.

We will create a "Live Limits Dashboard" that pulls directly from Redis. This proves that the headers were sniffed correctly. If you see "Limit: 5000" in this dashboard, you know the system successfully parsed the x-ratelimit-limit header.

Here is the complete plan for the Frontend Developer (to build the view) and the AI Agent (to build the data pipe), followed by your Table Injection Instructions.

Part 1: The "Live Limits" Dashboard (Visual Assurance)
To: Frontend Developer From: Backend Developer Subject: Exposing Redis Rate Limits to UI

The user needs to see the real-time constraints we've discovered from the provider. Please build a small "Live Stats" badge or popover on the Provider Card.

1. Backend Work (AI Agent Task) Create a new router to fetch ephemeral Redis data.

File: apps/api/src/routers/usage.router.ts

TypeScript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { UsageCollector } from '../services/UsageCollector.js';

export const usageRouter = createTRPCRouter({
  getProviderStats: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      // This calls the UsageCollector to fetch raw Redis keys
      return await UsageCollector.getProviderStats(input.providerId);
    }),
});
Update UsageCollector.ts: Add the getter method.

TypeScript
static async getProviderStats(providerId: string) {
  const client = await getRedisClient();
  const base = `limit:${providerId}`;

  const [rpmMax, rpmCurr, tpmMax, tpmCurr, balance] = await client.mGet([
    `${base}:rpm:max`,
    `${base}:rpm:current`, // Remember: this might be 'remaining' depending on provider
    `${base}:tpm:max`,
    `${base}:tpm:current`,
    `balance:${providerId}`
  ]);

  return {
    rpm: { max: parseInt(rpmMax || '0'), current: parseInt(rpmCurr || '0') },
    tpm: { max: parseInt(tpmMax || '0'), current: parseInt(tpmCurr || '0') },
    credits: balance ? parseFloat(balance) : null
  };
}
2. Frontend Work (UI Component) Add this to apps/ui/src/components/ProviderList.tsx:

Visual: A small "Pulse" indicator. Green = Good Capacity, Red = Throttled.

Hover/Click: Shows the raw numbers:

OpenRouter Live Stats

RPM: 45 / 200 (Discovered)

TPM: 15k / 100k (Discovered)

Credits: $9.80 (Cached)

Part 2: Instructions for Injecting Your Model Table
You want to bring your own data. Since our DynamicModelAdapter is flexible, you just need a table with specific columns. You can name the table whatever you want (e.g., my_approved_models), then select it in the settings.

The "Golden Schema" for Zero-Spend Safety Your table MUST contain these columns to work with the Safety System.

Column Name	Type	Required?	Description
model_id	Text	YES	The exact ID sent to the API (e.g., meta-llama/llama-3-8b-instruct:free).
provider_id	Text	YES	Must match the Provider ID you created in the app (e.g., openrouter).
is_free_tier	Boolean	YES	Critical. Set to true or 1. The Router blocks anything else.
cost	Float	YES	Set to 0.0. Any value > 0 triggers the firewall.
context_length	Int	No	Used for "Smallest Model" probe selection. Defaults to 4096.
priority	Int	No	0-100. Higher numbers get picked more often by the router.
SQL Query to Create This Table (Run in DataNode):

SQL
CREATE TABLE my_free_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id TEXT NOT NULL,
    provider_id TEXT NOT NULL, -- This links to your Provider Config
    name TEXT,
    
    -- The Safety Fields
    is_free_tier BOOLEAN DEFAULT true,
    cost NUMERIC DEFAULT 0.0,
    
    -- The Logic Fields
    context_length INT DEFAULT 4096,
    priority INT DEFAULT 50,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example Insert: The "Guinea Pig" model for probing
INSERT INTO my_free_models (model_id, provider_id, name, is_free_tier, cost, context_length)
VALUES 
('google/gemini-2.0-flash-lite-preview-02-05:free', 'your_openrouter_id_here', 'Gemini Free', true, 0.0, 8192);
How to connect it:

Run the SQL above in your DataNode (or import a CSV with these headers).

Go to Settings -> Orchestrator Config.

Select my_free_models from the dropdown.

Done. The system now only knows about these models.

