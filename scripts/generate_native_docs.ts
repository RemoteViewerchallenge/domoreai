
async function main() {
  console.log('Starting documentation generation...');

  try {
      console.log('Importing modules...');
      const { AgentRuntime } = await import('../apps/api/src/services/AgentRuntime.js');
      const { ToolDocumenter } = await import('../apps/api/src/services/ToolDocumenter.js');
      console.log('Modules imported.');

      console.log('Generating documentation for native tools...');
      
      const { createFsTools } = await import('../apps/api/src/tools/filesystem.js');
      const { getNativeTools } = await import('../apps/api/src/services/tools/NativeToolsRegistry.js');
      const { metaTools } = await import('../apps/api/src/tools/meta.js');

      const rootPath = process.cwd();
      const fsTools = createFsTools(rootPath);
      const nativeToolsDefs = getNativeTools(rootPath, fsTools);
      const metaToolsDefs = metaTools as any[];

      const allNativeTools = [...nativeToolsDefs, ...metaToolsDefs];

      // Convert ToolDefinition to Tool interface expected by ToolDocumenter
      const tools = allNativeTools.map((t: any) => ({
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
