import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class IngestionService {
  private static SHADOW_DIR = path.join(process.cwd(), '.domoreai/shadow');
  private static UNSTRUCTURED_API_URL = process.env.UNSTRUCTURED_API_URL || 'https://api.unstructured.io/general/v0/general';
  private static UNSTRUCTURED_API_KEY = process.env.UNSTRUCTURED_API_KEY;

  constructor() {
    this.ensureShadowDir();
  }

  private ensureShadowDir() {
    if (!fs.existsSync(IngestionService.SHADOW_DIR)) {
      fs.mkdirSync(IngestionService.SHADOW_DIR, { recursive: true });
    }
  }

  /**
   * Ingests a file: sends it to Unstructured API and saves the result as a shadow file.
   * @param filePath Absolute path to the file to ingest.
   * @returns The path to the created shadow file.
   */
  async ingestFile(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      console.log(`[IngestionService] Ingesting file: ${filePath}`);

      // 1. Prepare form data for Unstructured API
      // We can't use standard FormData in Node easily without a library if we want to stream, 
      // but axios takes a Buffer or Stream usually.
      // Let's use 'form-data' library if available, or just construct it if simple.
      // For simplicity/standard in this repo, let's see if we can use a basic approach.
      // Often 'axios' with 'form-data' package is best.
      // I'll assume we can read the file into a buffer.
      
      // NOTE: For a robust implementation, usually `form-data` package is needed for file uploads in Node.
      // Checking if we can try to skip that dep if not present, but it's risky.
      // Let's check if 'form-data' is in package.json (I recall seeing axios).
      // If not, I'll stick to a simple buffer if Unstructured accepts it, or just install 'form-data'.
      // For now, I'll attempt a direct POST with axios as a buffer if the API supports binary, 
      // BUT Unstructured usually expects multipart/form-data.
      
      // Let's fallback to `fetch` with `FormData` which is available in Node 18+ global.
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('files', blob, fileName);

      const headers: Record<string, string> = {};
      if (IngestionService.UNSTRUCTURED_API_KEY) {
        headers['unstructured-api-key'] = IngestionService.UNSTRUCTURED_API_KEY;
      }

      console.log(`[IngestionService] Sending to ${IngestionService.UNSTRUCTURED_API_URL}...`);
      
      const response = await fetch(IngestionService.UNSTRUCTURED_API_URL, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unstructured API failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[IngestionService] Received ${Array.isArray(data) ? data.length : 0} elements.`);

      // 2. Save as Shadow File
      const shadowFileName = `${fileName}.json`;
      const shadowFilePath = path.join(IngestionService.SHADOW_DIR, shadowFileName);
      
      fs.writeFileSync(shadowFilePath, JSON.stringify(data, null, 2));
      console.log(`[IngestionService] Shadow file saved: ${shadowFilePath}`);

      return shadowFilePath;

    } catch (error) {
      console.error('[IngestionService] Error ingesting file:', error);
      throw error;
    }
  }

  /**
   * Retrieves the content of a shadow file.
   */
  getShadowFile(fileName: string): any {
    const shadowFilePath = path.join(IngestionService.SHADOW_DIR, fileName);
    if (!fs.existsSync(shadowFilePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(shadowFilePath, 'utf-8'));
  }
}

export const ingestionService = new IngestionService();
