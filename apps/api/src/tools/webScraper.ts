// turndown has no bundled types in this project; silence TS here
// @ts-ignore
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export async function fetchPageAsMarkdown(args: { url: string, timeoutMs?: number }) {
  const { url, timeoutMs = 30000 } = args;
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; Bot/1.0)');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    const html = await page.content();
    const $ = cheerio.load(html);
    const title = $('title').first().text() || '';
    // Attempt to extract main article with common selectors
    const mainHtml = $('article').html() || $('main').html() || $('body').html() || html;
    // Convert to markdown
    const markdown = turndown.turndown(mainHtml);
    const text = $(mainHtml).text();
    return { success: true, url, title, markdown, text, html: mainHtml };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

// Tool wrapper compatible with AgentRuntime native tool registration
export const webScraperTool = {
  name: 'research.web_scrape',
  description: 'Fetch a URL and return extracted content as markdown and text',
  handler: async (args: { url: string }) => {
    return await fetchPageAsMarkdown(args as any);
  },
  input_schema: {
    type: 'object',
    properties: { url: { type: 'string' } },
    required: ['url']
  }
};
