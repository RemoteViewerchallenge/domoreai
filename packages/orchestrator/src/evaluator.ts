export class Evaluator {
  async evaluate(task: any, response: any) {
    const score = response.text && !response.text.toLowerCase().includes('todo') ? 1 : 0.0;
    return { score, passed: score >= 0.5, details: [] };
  }
}
