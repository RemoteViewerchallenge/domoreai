import axios from 'axios';

export class LootboxService {
  private readonly lootboxUrl = process.env.LOOTBOX_URL || 'http://localhost:3000';

  async getTools() {
    try {
      const response = await axios.get(`${this.lootboxUrl}/namespaces`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw new Error('Could not fetch tools from the registry.');
    }
  }

  async executeTool(toolName: string, args: any) {
    try {
      const response = await axios.post(`${this.lootboxUrl}/execute`, { toolName, args });
      return response.data;
    } catch (error) {
      console.error('Error executing tool:', error);
      throw new Error('Could not execute tool.');
    }
  }
}
