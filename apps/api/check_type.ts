
import { CodeModeUtcpClient } from '@utcp/code-mode';

type RegisterManualArg = Parameters<CodeModeUtcpClient['registerManual']>[0];

const test: RegisterManualArg = {
    name: 'test',
    tools: [],
    // This should trigger an error revealing the required properties and their types
};
