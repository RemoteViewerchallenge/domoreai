import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StrategyRule {
  role: string;
  model: string;
}

interface StrategyConfig {
  rules: StrategyRule[];
  defaults: {
    fallback: string;
  };
}

export class StrategyEngine {
  private config: StrategyConfig;
  private configPath: string;

  constructor(configPath?: string) {
    if (configPath) {
      this.configPath = configPath;
    } else {
      // Assuming CJS environment or compat
      this.configPath = path.resolve(__dirname, '../config/strategy.yaml');
    }
    this.config = this.loadConfig();
  }

  private loadConfig(): StrategyConfig {
    if (!fs.existsSync(this.configPath)) {
      // Return safe defaults if config is missing
      return {
        rules: [],
        defaults: { fallback: 'gpt-3.5-turbo' }
      };
    }
    const fileContents = fs.readFileSync(this.configPath, 'utf8');
    return YAML.parse(fileContents) as StrategyConfig;
  }

  selectModel(role: string): string {
    const matchedRule = this.config.rules.find(r => r.role === role);
    if (matchedRule) {
      return matchedRule.model;
    }
    return this.config.defaults.fallback;
  }
  
  reload() {
      this.config = this.loadConfig();
  }
}
