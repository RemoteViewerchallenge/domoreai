// Execute "code-mode" in a safe, auditable way.
// - Parse TypeScript using TypeScript compiler API
// - Extract calls to callTool('<toolName>', <literalArgs>)
// - Evaluate only literal expressions (strings, numbers, booleans, arrays, object literals)
// - Execute registered tools via runTool and return the results.
//
// Usage:
//   const results = await executeCodeAndRunTools(code);
import * as ts from 'typescript';
import { runTool } from './tool-registry';

function isLiteralNode(node: ts.Node): boolean {
  return ts.isStringLiteral(node) || ts.isNumericLiteral(node) || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword
    || ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node) || node.kind === ts.SyntaxKind.NullKeyword;
}

function evalLiteral(node: ts.Expression): any {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(e => {
    if (!isLiteralNode(e)) throw new Error('Non-literal in array argument not allowed');
    return evalLiteral(e as ts.Expression);
  });
  if (ts.isObjectLiteralExpression(node)) {
    const out: any = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) throw new Error('Unsupported object property in args');
      const name = prop.name.text;
      const init = prop.initializer;
      if (!isLiteralNode(init)) throw new Error('Non-literal in object property not allowed');
      out[name] = evalLiteral(init as ts.Expression);
    }
    return out;
  }
  throw new Error('Unsupported literal node');
}

export async function executeCodeAndRunTools(sourceCode: string) {
  // Extract code from markdown code blocks if present
  let code = sourceCode;
  const codeBlockMatch = sourceCode.match(/```(?:ts|typescript|javascript|js)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    code = codeBlockMatch[1];
  }
  
  const src = ts.createSourceFile('ai.ts', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const toolCalls: Array<{ tool: string; args: any; node: ts.CallExpression }> = [];

  function walk(n: ts.Node) {
    if (ts.isCallExpression(n)) {
      // expect identifier callTool(...)
      if (ts.isIdentifier(n.expression) && n.expression.text === 'callTool') {
        const args = n.arguments;
        if (args.length === 0) throw new Error('callTool requires at least tool name');
        const first = args[0];
        if (!ts.isStringLiteral(first)) throw new Error('callTool first arg must be string literal tool name');
        const toolName = first.text;
        const payload = args.length >= 2 ? args[1] : ts.factory.createObjectLiteralExpression();
        if (!isLiteralNode(payload)) throw new Error('callTool second arg must be a literal (object/array/string/number)');
        const evaluated = evalLiteral(payload as ts.Expression);
        toolCalls.push({ tool: toolName, args: evaluated, node: n });
      }
    }
    ts.forEachChild(n, walk);
  }

  walk(src);

  const results: any[] = [];
  for (const c of toolCalls) {
    try {
      const res = await runTool(c.tool, c.args);
      results.push({ tool: c.tool, args: c.args, result: res });
    } catch (e) {
      results.push({ tool: c.tool, args: c.args, error: String(e) });
    }
  }
  return results;
}