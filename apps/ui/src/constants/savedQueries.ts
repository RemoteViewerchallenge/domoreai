// Saved queries for Data Lake promotion workflow
export type SavedQueryName = keyof typeof SAVED_QUERIES;
export const SAVED_QUERIES: Record<string, string> = {
  "OpenAI - Free/Cheap Only": "SELECT * FROM \"RawDataLake\" WHERE provider = 'openai' AND is_free = true;",
  "Ollama - All Local": "SELECT * FROM \"RawDataLake\" WHERE provider = 'ollama';",
  // Add more queries as needed
};
