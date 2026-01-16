# meta Tool Documentation (v2.0)

## Overview
The `meta` toolset enables agents to discover existing roles, evolve new agent personas (DNA), and fine-tune system configurations. These tools are registered under the `system` namespace.

## 🛠️ TOOL SIGNATURES

### 1. system.role_registry_list
List all available personas and roles in the system. Use for discovery to avoid creating duplicate roles.

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

### 2. system.role_variant_evolve
Evolve a new Role Variant (DNA) using the Role Factory. This is a high-complexity operation that generates a complete personality, base prompt, and toolset based on an intent.

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "roleId": { "type": "string", "description": "Optional ID of existing role to evolve. If omitted, a new Base Role is created." },
    "intent": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "description": "Name of the role to create or evolve" },
        "description": { "type": "string", "description": "High-level goal of the agent" },
        "domain": { "type": "string", "description": "e.g. 'Frontend', 'Backend', 'Security', 'Creative'" },
        "complexity": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH"] },
        "capabilities": { "type": "array", "items": { "type": "string" }, "description": "e.g. ['vision', 'coding', 'reasoning']" }
      },
      "required": ["name", "description", "domain", "complexity"]
    }
  },
  "required": ["intent"]
}
```

### 3. system.role_config_patch
Perform targeted updates to a role's basePrompt or tools array. Use this for fine-tuning after evolution or fixing specific behaviors.

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "roleId": { "type": "string", "description": "ID of the role to update" },
    "updates": {
      "type": "object",
      "properties": {
        "basePrompt": { "type": "string" },
        "tools": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["roleId", "updates"]
}
```

---

## Usage Examples

### Example 1: Discovering Roles
**JSON Mode:**
```json
{ "tool": "system.role_registry_list", "args": {} }
```

**Code Mode:**
```typescript
const roles = await system.role_registry_list({});
console.log(roles);
```

### Example 2: Evolving a Specialized Role
**JSON Mode:**
```json
{
  "tool": "system.role_variant_evolve",
  "args": {
    "intent": {
      "name": "Security Auditor",
      "description": "Scans code for vulnerabilities and secret leaks",
      "domain": "Security",
      "complexity": "HIGH",
      "capabilities": ["reasoning", "coding"]
    }
  }
}
```

**Code Mode:**
```typescript
const result = await system.role_variant_evolve({
  intent: {
    name: "Security Auditor",
    description: "Scans code for vulnerabilities and secret leaks",
    domain: "Security",
    complexity: "HIGH"
  }
});
console.log(result);
```

### Example 3: Patching an Existing Role
**JSON Mode:**
```json
{
  "tool": "system.role_config_patch",
  "args": {
    "roleId": "clx123abc",
    "updates": {
      "tools": ["git", "filesystem", "search_codebase"]
    }
  }
}
```

**Code Mode:**
```typescript
await system.role_config_patch({
  roleId: "clx123abc",
  updates: {
    basePrompt: "You are now more aggressive in your debugging..."
  }
});
```

## Best Practices
1. **Discover First**: Always run `system.role_registry_list` before creating a role to see if a similar persona already exists.
2. **Atomic Evolution**: Use `system.role_variant_evolve` for the heavy lifting (DNA generation).
3. **Surgical Patches**: Use `system.role_config_patch` for minor adjustments rather than re-evolving the whole role.
4. **Namespace**: Always use the `system.` prefix for these tools.
