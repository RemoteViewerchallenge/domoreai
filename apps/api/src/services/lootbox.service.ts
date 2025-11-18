
export class LootboxService {
  async getTools() {
    return [];
  }

  async executeTool(toolName: string, args: any) {
    return {
      output: `This is a mock response from the ${toolName} tool.`,
    };
  }
}
