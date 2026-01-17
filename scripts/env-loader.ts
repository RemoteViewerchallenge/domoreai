import path from 'path';
import fs from 'fs';
import { env } from 'process';

/**
 * Robust environment loader that checks for .env.local and .env
 * using Node's native loadEnvFile (Node 20.6+).
 */
export function loadEnv() {
    const root = process.cwd();
    const envFiles = ['.env.local', '.env'];
    
    // Check root and parent (in case we are in scripts/)
    const dirs = [root, path.join(root, '..')];

    for (const dir of dirs) {
        for (const file of envFiles) {
            const fullPath = path.join(dir, file);
            if (fs.existsSync(fullPath)) {
                try {
                    // @ts-ignore - process.loadEnvFile is Node 20.6+
                    if (typeof (process as any).loadEnvFile === 'function') {
                        console.log(`[Env] 📁 Loading environment from: ${fullPath} (native)`);
                        (process as any).loadEnvFile(fullPath);
                    } else {
                        console.warn(`[Env] Native loadEnvFile not supported on this Node version. Use --env-file flag.`);
                    }
                } catch (err) {
                    console.error(`[Env] Failed to load ${fullPath}:`, err);
                }
            }
        }
    }
}
