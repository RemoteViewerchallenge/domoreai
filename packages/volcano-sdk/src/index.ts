
export const run = async (params: { prompt: string }) => {
  console.log('--- Mock volcano-sdk run ---');
  console.log(params.prompt);
  return {
    output: 'This is a mock response from the volcano-sdk.',
  };
};

const mockLlm = (params: any) => ({
  gen: (params: any) => 'This is a mock response from a mock LLM.',
});

export const llmOpenAI = mockLlm;
export const llmMistral = mockLlm;
export const llmLlama = mockLlm;
export const llmVertexStudio = mockLlm;
