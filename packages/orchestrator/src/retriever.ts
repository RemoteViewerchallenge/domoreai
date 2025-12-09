export class Retriever {
  async retrieve(opts: any) {
    return [{ id: 'doc1', snippet: 'example snippet from retriever' }];
  }
  async index(doc: any) { return true; }
}
