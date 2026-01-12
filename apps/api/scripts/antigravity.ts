import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as readline from 'readline';
import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';

// --- CONFIGURATION ---
// In a real app, these come from your Google Cloud Console (APIs & Services > Credentials)
// For emulation, you need an OAuth Client ID configured as a "Desktop App" or "Web App".
// TODO: Replace these with your actual credentials
const CLIENT_ID = '1051593374104-hsif187melhbsmtka9m7cgi8nhekctuf.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];
const TOKEN_PATH = 'token.json';

// --- 1. AUTHENTICATION (The "Antigravity Login" Layer) ---
async function getAccessToken(): Promise<string> {
  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // A. Check if we already have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    client.setCredentials(tokens);
    // Refresh if needed
    try {
      const { credentials } = await client.refreshAccessToken();
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
      return credentials.access_token!;
    } catch (e) {
      console.log("Token expired or invalid, re-authenticating...");
    }
  }

  // B. If not, start the "Login with Google" flow
  return new Promise((resolve, reject) => {
    const authUrl = client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    
    // Create a temporary local server to catch the callback
    const server = http.createServer(async (req, res) => {
      if (req.url?.startsWith('/oauth2callback')) {
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');
        res.end('Login successful! You can close this tab.');
        server.close();

        if (code) {
          const { tokens } = await client.getToken(code);
          client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          resolve(tokens.access_token!);
        }
      }
    }).listen(3000);

    // Open browser automatically
    console.log('Opening browser for login...');
    console.log(`IMPORTANT: Ensure this Redirect URI is added to your Google Cloud Console credentials: ${REDIRECT_URI}`);
    const startCmd = process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} "${authUrl}"`);
    console.log(`If browser doesn't open, visit: ${authUrl}`);
  });
}

// --- 2. THE API CALL (The "Gemini 3" Layer) ---
interface GeminiResponse {
  candidates: {
    content: { parts: { text?: string; thoughtSignature?: string }[] };
  }[];
}

async function chatLoop(accessToken: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  // Antigravity State: We must track the signature to keep the "Thread" alive
  let lastThoughtSignature: string | null = null;
  const chatHistory: any[] = [];

  console.log("\n--- Antigravity Emulator Ready (Gemini 3 Pro) ---");
  console.log("Type your instruction (e.g., 'Create a plan for a snake game')\n");

  const ask = () => {
    rl.question('> ', async (userInput) => {
      
      // 1. Construct the Message
      chatHistory.push({ role: 'user', parts: [{ text: userInput }] });

      // 2. Prepare the Request Body
      // Note: We inject the previous thoughtSignature if we have one.
      const payload: any = {
        contents: chatHistory,
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "high" // <--- The "Antigravity" magic setting
          }
        }
      };

      // CRITICAL: If we have a signature from the previous turn, we MUST send it back
      // or the model loses its "train of thought" and reasoning depth drops.
      if (lastThoughtSignature) {
        // In the REST API, this is often passed as a specific field in the previous content 
        // or a separate context field depending on the exact beta version.
        // For emulation, we append it to the context or headers as per latest docs.
        // (Implementation varies by exact beta version, conceptually it links the turns).
        // Note: As of latest beta, it might be passed in 'contents' or separate field.
        // We will try appending to the last model response in history if possible, 
        // or just rely on the session context if using the client library.
        // Since we are using raw REST, we need to be careful.
        // For now, we'll assume the model returns it and we just need to keep the history intact.
        // Some versions require sending it back explicitly in a 'thought_signature' field.
      }

      // 3. The Raw Fetch Call
      try {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`, // <--- The Google Login Token
              'X-Goog-User-Project': 'YOUR_PROJECT_ID' // Required for OAuth calls
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as GeminiResponse;
        
        if (!data.candidates || data.candidates.length === 0) {
            console.log("No candidates returned.");
            ask();
            return;
        }

        const candidate = data.candidates[0];
        const responseText = candidate.content.parts.map(p => p.text).join('');
        
        // 4. Capture the Thought Signature for the next turn
        // It acts like a "save game" state for the model's brain.
        const sigPart = candidate.content.parts.find(p => p.thoughtSignature);
        if (sigPart && sigPart.thoughtSignature) {
           lastThoughtSignature = sigPart.thoughtSignature;
        }

        console.log(`\nAntigravity Agent:\n${responseText}\n`);
        
        // Update history
        chatHistory.push(candidate.content);
        
      } catch (e) {
        console.error("Error:", e);
      }
      
      ask();
    });
  };

  ask();
}

// --- RUN ---
(async () => {
  try {
    const token = await getAccessToken();
    await chatLoop(token);
  } catch (err) {
    console.error("Failed to start:", err);
  }
})();
