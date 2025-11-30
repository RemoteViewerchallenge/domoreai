
import { CodeModeUtcpClient } from '@utcp/code-mode';

type RegisterManualArg = Parameters<CodeModeUtcpClient['registerManual']>[0];

const test: RegisterManualArg = {
    name: 'test',
    tools: [],
    call_template_type: 'manual',
};
