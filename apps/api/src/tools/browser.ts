import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export const browserTools = {
  fetchPage: async ({ url }: { url: string }) => {
    const res = await fetch(url);
    const html = await res.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    return {
      title: article?.title || doc.window.document.title,
      content: article?.textContent || "No content found",
      markdown: article?.textContent // Or convert HTML to Markdown here
    };
  }
};
