/**
 * Lightweight JSX parser for Nebula ingestion
 * Converts React/JSX code into Nebula node structures
 */

export interface ParsedElement {
  tag: string;
  props: Record<string, any>;
  children: (ParsedElement | string)[];
  isSelfClosing: boolean;
}

export class JsxParser {
  /**
   * Extract JSX from a React component's return statement
   */
  static extractJsx(code: string): string {
    // Try to find return statement
    const returnMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    if (returnMatch) {
      return returnMatch[1].trim();
    }
    
    // Fallback: assume entire code is JSX
    return code.trim();
  }

  /**
   * Parse JSX string into element tree
   */
  static parse(jsx: string): ParsedElement | null {
    jsx = jsx.trim();
    if (!jsx) return null;

    // Handle text nodes
    if (!jsx.startsWith('<')) {
      return null; // Text content will be handled by parent
    }

    // Extract tag name
    const tagMatch = jsx.match(/^<(\w+)/);
    if (!tagMatch) return null;
    
    const tag = tagMatch[1];

    // Check if self-closing
    const isSelfClosing = jsx.includes('/>');

    // Extract props
    const propsMatch = jsx.match(/<\w+([^>]*?)(\/>|>)/);
    const propsString = propsMatch ? propsMatch[1].trim() : '';
    const props = this.parseProps(propsString);

    // If self-closing, no children
    if (isSelfClosing) {
      return { tag, props, children: [], isSelfClosing: true };
    }

    // Extract content between opening and closing tags
    const contentMatch = jsx.match(new RegExp(`<${tag}[^>]*>(.*)<\/${tag}>`, 's'));
    const content = contentMatch ? contentMatch[1] : '';

    // Parse children
    const children = this.parseChildren(content);

    return { tag, props, children, isSelfClosing: false };
  }

  /**
   * Parse props string into object
   */
  private static parseProps(propsString: string): Record<string, any> {
    const props: Record<string, any> = {};
    
    if (!propsString) return props;

    // Match prop="value" or prop={value}
    const propRegex = /(\w+)=(?:"([^"]*)"|{([^}]*)})/g;
    let match;

    while ((match = propRegex.exec(propsString)) !== null) {
      const [, key, stringValue, jsValue] = match;
      props[key] = stringValue || jsValue;
    }

    return props;
  }

  /**
   * Parse children elements and text
   */
  private static parseChildren(content: string): (ParsedElement | string)[] {
    const children: (ParsedElement | string)[] = [];
    content = content.trim();

    if (!content) return children;

    // Simple approach: split by top-level tags
    let depth = 0;
    let current = '';
    let inTag = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '<') {
        if (content[i + 1] === '/') {
          depth--;
          inTag = true;
        } else {
          if (depth === 0 && current.trim()) {
            children.push(current.trim());
            current = '';
          }
          depth++;
          inTag = true;
        }
      } else if (char === '>') {
        inTag = false;
        if (depth === 0 && current.trim().startsWith('<')) {
          const parsed = this.parse(current.trim());
          if (parsed) children.push(parsed);
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      if (current.trim().startsWith('<')) {
        const parsed = this.parse(current.trim());
        if (parsed) children.push(parsed);
      } else {
        children.push(current.trim());
      }
    }

    return children;
  }

  /**
   * Map HTML tag to Nebula component type
   */
  static mapToNebulaType(htmlTag: string): string {
    const mapping: Record<string, string> = {
      'div': 'Box',
      'span': 'Text',
      'p': 'Text',
      'h1': 'Text',
      'h2': 'Text',
      'h3': 'Text',
      'h4': 'Text',
      'h5': 'Text',
      'h6': 'Text',
      'button': 'Button',
      'input': 'Input',
      'img': 'Image',
      'a': 'Button',
    };

    return mapping[htmlTag.toLowerCase()] || 'Box';
  }
}
