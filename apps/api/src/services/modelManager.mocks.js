/**
 * Represents the raw, inconsistent data we get back from different providers.
 * This is the "messy" input our service must clean up.
 */
// Example 1: A standard, paid provider (e.g., OpenAI)
export const directProviderResponse = {
    modelConfigId: 'cl_openai_gpt4o',
    roleId: 'cl_role_coder',
    userId: 'user_123',
    usage: {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
    },
    cost: 0.0025,
    // ... other metadata
};
// Example 2: A free provider (no token/cost data)
export const freeProviderResponse = {
    modelConfigId: 'cl_free_model_xyz',
    roleId: 'cl_role_coder',
    userId: 'user_123',
    usage: null, // They don't provide usage
    cost: 0.0,
    // ... other metadata
};
// Example 3: A router (e.g., OpenRouter)
export const routerProviderResponse = {
    modelConfigId: 'cl_openrouter_sonnet',
    roleId: 'cl_role_coder',
    userId: 'user_123',
    usage: {
        prompt_tokens: 400,
        completion_tokens: 200,
    },
    cost: 0.0001,
    // This is the "messy" part we need to store!
    router_metadata: {
        id: 'req_abc123',
        model_name: 'anthropic/claude-3-sonnet',
        provider_name: 'Anthropic',
        latency_ms: 1200,
    },
};
