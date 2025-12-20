import * as ts from "typescript";
import {
  NebulaNode,
  NebulaId,
  StyleTokens,
  NebulaTree,
  DataBinding,
  NodeType,
} from "../core/types.js";
import { nanoid } from "nanoid";

/**
 * @Role: Compiler Engineer
 * @Task: Build Advanced Ingestion Logic
 * @Context: Parses React Logic (Maps, Conditions) and Custom Components.
 */
export class AstTransformer {
  private nodes: Record<NebulaId, NebulaNode> = {};

  // Config: List of components to KEEP as black boxes (don't explode)
  private preservedComponents = new Set<string>([
    "Header",
    "Footer",
    "DataGrid",
    "DatePicker",
    "Calendar",
  ]);

  /**
   * Set which components should be preserved as black boxes
   */
  public setPreservedComponents(components: string[]) {
    this.preservedComponents = new Set(components);
  }

  /**
   * Converts a generic JSX string or full file into a Nebula Tree Fragment.
   */
  public parse(code: string): NebulaTree {
    this.nodes = {}; // Reset nodes

    const isSnippet = !code.includes("import ") && !code.includes("export ");
    const source = isSnippet ? `<>${code}</>` : code;

    const file = ts.createSourceFile(
      "temp.tsx",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const imports: string[] = [];
    const exports: string[] = [];

    // Capture standard imports and re-exports
    file.statements.forEach((statement) => {
      if (ts.isImportDeclaration(statement)) {
        imports.push(statement.getText());
      }
      // Capture "export { Foo } from 'bar'" or "export { Foo }"
      if (ts.isExportDeclaration(statement)) {
        exports.push(statement.getText());
      }
    });

    let targetJsx: ts.Node | null = null;

    // 1. Try to find the default export
    const findDefaultExport = (n: ts.Node): ts.Node | null => {
      if (ts.isExportAssignment(n)) return n.expression;
      if (
        (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) &&
        n.modifiers
      ) {
        const hasExport = n.modifiers.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );
        const hasDefault = n.modifiers.some(
          (m) => m.kind === ts.SyntaxKind.DefaultKeyword
        );
        if (hasExport && hasDefault) return n;
      }
      return ts.forEachChild(n, findDefaultExport) || null;
    };

    const defaultExport = findDefaultExport(file);

    // 2. If we found a default export, search for JSX inside it
    if (defaultExport) {
      const findInnerJsx = (n: ts.Node): ts.Node | null => {
        if (
          ts.isJsxElement(n) ||
          ts.isJsxSelfClosingElement(n) ||
          ts.isJsxFragment(n)
        )
          return n;
        return ts.forEachChild(n, findInnerJsx) || null;
      };
      targetJsx = findInnerJsx(defaultExport);
    }

    // 3. Fallback: Take the first JSX root found anywhere in the file
    if (!targetJsx) {
      const findFirstJsx = (n: ts.Node): ts.Node | null => {
        if (
          ts.isJsxElement(n) ||
          ts.isJsxSelfClosingElement(n) ||
          ts.isJsxFragment(n)
        )
          return n;
        return ts.forEachChild(n, findFirstJsx) || null;
      };
      targetJsx = findFirstJsx(file);
    }

    if (!targetJsx) {
      throw new Error(
        "Failed to parse JSX: No JSX elements found in the provided code."
      );
    }

    const rootNode = this.visit(targetJsx);

    if (!rootNode) {
      throw new Error("Failed to parse JSX: Root node processing failed.");
    }

    return {
      rootId: rootNode.id,
      nodes: this.nodes,
      imports,
      exports,
      version: 1,
    };
  }

  private visit(node: ts.Node): NebulaNode | null {
    // 1. Handle Conditional Logic: {condition && <Child />}
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      const id = nanoid();
      const childNode = this.visit(node.right);

      const conditionNode: NebulaNode = {
        id,
        type: "Condition",
        props: {},
        style: {},
        children: childNode ? [childNode.id] : [],
        logic: { condition: node.left.getText() },
        meta: { label: `If ${node.left.getText()}` },
      };
      this.nodes[id] = conditionNode;
      return conditionNode;
    }

    // 2. Handle Loops: {items.map(item => <Child />)}
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      if (node.expression.name.text === "map") {
        const collection = node.expression.expression.getText(); // "items"
        const fn = node.arguments[0];

        if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
          const iterator = fn.parameters[0]?.name.getText() || "item";
          const body = fn.body;

          // If body is block { return ... }, find the return statement
          let childNode: ts.Node | null = null;
          if (ts.isBlock(body)) {
            childNode = this.findRootJsx(body);
          } else {
            childNode = body;
          }

          const parsedChild = childNode ? this.visit(childNode) : null;
          const id = nanoid();

          const loopNode: NebulaNode = {
            id,
            type: "Loop",
            props: {},
            style: {},
            children: parsedChild ? [parsedChild.id] : [],
            logic: { loopData: collection, iterator },
            meta: { label: `Loop (${collection})` },
          };
          this.nodes[id] = loopNode;
          return loopNode;
        }
      }
    }

    // 3. Handle JSX Elements
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      return this.mapJsxElement(node);
    }

    // 4. HANDLE TEXT EXPRESSIONS: <span>{user.name}</span>
    if (ts.isJsxExpression(node)) {
      const expression = node.expression;
      if (expression) {
        const bindingPath = this.extractBindingPath(expression);
        if (bindingPath) {
          // Return a Text node with a binding attached
          const id = nanoid();
          const textNode: NebulaNode = {
            id,
            type: "Text",
            props: { content: `{{${bindingPath}}}` }, // Visual placeholder
            style: {},
            children: [],
            bindings: [{ propName: "content", sourcePath: bindingPath }],
          };
          this.nodes[id] = textNode;
          return textNode;
        }
      }
    }

    // 5. Handle Static Text
    if (ts.isJsxText(node)) {
      const text = node.getText().trim();
      if (!text) return null;

      const id = nanoid();
      const textNode: NebulaNode = {
        id,
        type: "Text",
        props: { content: text },
        style: {},
        children: [],
      };
      this.nodes[id] = textNode;
      return textNode;
    }

    // 6. Handle Expressions (e.g. {children}, {variable}, or mapping)
    if (ts.isJsxExpression(node)) {
      let expressionText = node.expression?.getText() || "...";
      // Truncate long logic blocks for a cleaner UI
      if (expressionText.length > 40) {
        expressionText = expressionText.substring(0, 37) + "...";
      }

      const id = nanoid();
      const exprNode: NebulaNode = {
        id,
        type: "Text",
        props: {
          content: `{${expressionText}}`,
          className:
            "text-[10px] text-blue-400 font-mono bg-blue-500/5 px-1 rounded",
        },
        style: {},
        children: [],
      };
      this.nodes[id] = exprNode;
      return exprNode;
    }

    // 7. Traverse children if it's a Fragment or other wrapper
    const childrenNodes: NebulaNode[] = [];
    node.forEachChild((child) => {
      const result = this.visit(child);
      if (result) childrenNodes.push(result);
    });

    // If we parsed multiple nodes at root (or in a fragment/list), return a Container or the single child
    if (childrenNodes.length === 1) return childrenNodes[0];

    if (childrenNodes.length > 0) {
      // SourceFile/Fragment with multiple children -> Wrap in Box
      const id = nanoid();
      const containerNode: NebulaNode = {
        id,
        type: "Box", // Default container
        style: {},
        layout: { mode: "flex", direction: "column" },
        children: childrenNodes.map((c) => c.id),
        props: {},
      };
      this.nodes[id] = containerNode;
      return containerNode;
    }

    return null;
  }

  private mapJsxElement(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): NebulaNode {
    const tagName = ts.isJsxSelfClosingElement(node)
      ? node.tagName.getText()
      : node.openingElement.tagName.getText();

    // CHECK: Is this a Black Box component?
    if (this.preservedComponents.has(tagName)) {
      const id = nanoid();
      const componentNode: NebulaNode = {
        id,
        type: "Component",
        componentName: tagName,
        props: this.extractProps(node),
        style: {},
        children: [],
        meta: { locked: true, label: tagName, source: "imported" },
      };
      this.nodes[id] = componentNode;
      return componentNode;
    }

    // Standard Processing (Explosion)
    const props: Record<string, any> = {};
    const style: StyleTokens = {};
    const layout: any = {};
    const bindings: DataBinding[] = []; // Store discovered bindings here

    // Extract Attributes
    const attributes = ts.isJsxSelfClosingElement(node)
      ? node.attributes
      : node.openingElement.attributes;

    attributes.forEachChild((attr) => {
      if (ts.isJsxAttribute(attr)) {
        const name = attr.name.getText();
        let value: any = true;

        // HANDLE ATTRIBUTE EXPRESSIONS: <img src={product.image} />
        if (
          attr.initializer &&
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression
        ) {
          const bindingPath = this.extractBindingPath(
            attr.initializer.expression
          );
          if (bindingPath) {
            bindings.push({ propName: name, sourcePath: bindingPath });
            return; // Skip adding to static props
          }
        }

        if (attr.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            value = attr.initializer.text;
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression
          ) {
            // Fallback for non-binding expressions
            value = attr.initializer.expression.getText();
          }
        }
        // Parsing Tailwind Classes into StyleTokens and Layout
        if (name === "className" && typeof value === "string") {
          this.parseTailwindToTokens(value, style, layout);
        } else {
          props[name] = value;
        }
      }
    });

    const childrenNodes: NebulaNode[] = [];
    if (ts.isJsxElement(node)) {
      node.children.forEach((child) => {
        const res = this.visit(child);
        if (res) childrenNodes.push(res);
      });
    }

    const id = nanoid();

    // Normalize tag name to NodeType
    let nodeType: NodeType = this.normalizeTagName(tagName);

    const nebulaNode: NebulaNode = {
      id,
      type: nodeType,
      props,
      bindings, // <--- Attach harvested bindings
      style,
      layout,
      children: childrenNodes.map((c) => c.id),
      meta: { source: "imported" },
    };

    this.nodes[id] = nebulaNode;
    return nebulaNode;
  }

  /**
   * Normalize HTML tag names to Nebula NodeTypes
   */
  private normalizeTagName(tagName: string): NodeType {
    const lowerTag = tagName.toLowerCase();

    // Map common HTML tags to Nebula primitives
    if (
      lowerTag === "div" ||
      lowerTag === "section" ||
      lowerTag === "article" ||
      lowerTag === "main"
    ) {
      return "Box";
    }
    if (
      lowerTag === "span" ||
      lowerTag === "p" ||
      lowerTag === "h1" ||
      lowerTag === "h2" ||
      lowerTag === "h3"
    ) {
      return "Text";
    }
    if (lowerTag === "button") return "Button";
    if (lowerTag === "input" || lowerTag === "textarea") return "Input";
    if (lowerTag === "img") return "Image";

    // If it's capitalized, treat as a custom component
    if (tagName[0] === tagName[0].toUpperCase()) {
      return "Component";
    }

    // Default to Box for unknown tags
    return "Box";
  }

  /**
   * Extract props from JSX element for black-box components
   */
  private extractProps(
    node: ts.JsxElement | ts.JsxSelfClosingElement
  ): Record<string, any> {
    const props: Record<string, any> = {};
    const attributes = ts.isJsxSelfClosingElement(node)
      ? node.attributes
      : node.openingElement.attributes;

    attributes.forEachChild((attr) => {
      if (ts.isJsxAttribute(attr)) {
        const name = attr.name.getText();
        let value: any = true;

        if (attr.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            value = attr.initializer.text;
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression
          ) {
            value = attr.initializer.expression.getText();
          }
        }
        props[name] = value;
      }
    });

    return props;
  }

  /**
   * Helper to locate JSX in a file/block
   */
  private findRootJsx(node: ts.Node): ts.Node | null {
    // Simple DFS to find the first JsxElement
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) return node;

    // Check for return statements
    if (ts.isReturnStatement(node) && node.expression) {
      return this.findRootJsx(node.expression);
    }

    return ts.forEachChild(node, (n) => this.findRootJsx(n)) || null;
  }

  private parseTailwindToTokens(
    className: string,
    style: StyleTokens,
    layout: any
  ) {
    // Unconstrained mapping - allow any class
    const classes = className.split(/\s+/);
    classes.forEach((c) => {
      // Allow any style class without constraints
      if (c.startsWith("p-") || c.startsWith("px-") || c.startsWith("py-")) {
        style.padding = (style.padding || "") + " " + c;
      }
      if (c.startsWith("bg-")) style.background = c;
      if (c.startsWith("text-")) style.color = c;
      if (c.startsWith("rounded-")) style.radius = c;
      if (c.startsWith("shadow-")) style.shadow = c;
      if (c.startsWith("w-")) style.width = c;
      if (c.startsWith("h-")) style.height = c;
      if (c.startsWith("border")) style.border = c;

      // Allow any layout mode
      if (c === "flex" || c === "grid" || c === "absolute" || c === "flow") {
        layout.mode = c;
      }
      if (c.startsWith("flex-") || c === "flex-col" || c === "flex-row") {
        layout.direction = c.replace("flex-", "");
      }

      // Allow any alignment
      if (c.startsWith("items-")) {
        layout.align = c.replace("items-", "");
      }
      if (c.startsWith("justify-")) {
        layout.justify = c.replace("justify-", "");
      }

      if (c.startsWith("gap-")) layout.gap = c;
      if (c.startsWith("grid-cols-")) {
        layout.columns = parseInt(c.replace("grid-cols-", ""));
      }
    });
  }

  /**
   * Recursive helper to turn AST "user.profile.name" into string "user.profile.name"
   */
  private extractBindingPath(node: ts.Expression): string | null {
    // Handle simple identifier: "{name}"
    if (ts.isIdentifier(node)) {
      return node.text;
    }
    // Handle property access: "{user.name}" or "{props.data.title}"
    if (ts.isPropertyAccessExpression(node)) {
      const left = this.extractBindingPath(node.expression);
      const right = node.name.text;
      return left ? `${left}.${right}` : right;
    }
    return null; // Too complex (function calls, math, etc.)
  }
}
