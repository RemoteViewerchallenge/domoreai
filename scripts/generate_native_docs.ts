
async function main() {
  console.log('Starting documentation generation...');

  try {
      console.log('Importing modules...');
      const { AgentRuntime } = await import('../apps/api/src/services/AgentRuntime.js');
      const { ToolDocumenter } = await import('../apps/api/src/services/ToolDocumenter.js');
      console.log('Modules imported.');

      console.log('Generating documentation for native tools...');
      
      // 1. Get Native Tools from AgentRuntime
      const runtime = new AgentRuntime();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nativeToolsDefs = (runtime as any).getNativeTools();

      // Convert ToolDefinition to Tool interface expected by ToolDocumenter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools = nativeToolsDefs.map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.input_schema
      }));

      // 2. Document them
      await ToolDocumenter.documentTools('system', tools);
      
      console.log('Done!');
      process.exit(0);
  } catch (e) {
      console.error('Error:', e);
      process.exit(1);
  }
}

main();
