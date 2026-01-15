### Tool: `system.read_file`
**Description:** Read a file

**Signature:**
```typescript
await system.read_file(args: SystemRead_fileArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call read_file
await system.read_file({ /* args */ });
```

---

### Tool: `system.write_file`
**Description:** Write to a file

**Signature:**
```typescript
await system.write_file(args: SystemWrite_fileArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes |  |
| `content` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call write_file
await system.write_file({ /* args */ });
```

---

### Tool: `system.list_files`
**Description:** List files in a directory

**Signature:**
```typescript
await system.list_files(args: SystemList_filesArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call list_files
await system.list_files({ /* args */ });
```

---

### Tool: `system.browse`
**Description:** Fetch a web page

**Signature:**
```typescript
await system.browse(args: SystemBrowseArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call browse
await system.browse({ /* args */ });
```

---

### Tool: `system.research.web_scrape`
**Description:** Fetch a URL and return extracted content as markdown and text

**Signature:**
```typescript
await system.research.web_scrape(args: SystemResearch.web_scrapeArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call research.web_scrape
await system.research.web_scrape({ /* args */ });
```

---

### Tool: `system.analysis.complexity`
**Description:** Analyze task text and return a structured ComplexityScore for orchestration decisions

**Signature:**
```typescript
await system.analysis.complexity(args: SystemAnalysis.complexityArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `taskDescription` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call analysis.complexity
await system.analysis.complexity({ /* args */ });
```

---

### Tool: `system.terminal_execute`
**Description:** EXECUTE: Run a bash command in the project root.

RULES:
1. You are in a secure environment.
2. Output (stdout/stderr) is captured and returned to you.
3. Use this to run tests, install packages (npm install), or manage git.
4. Do NOT run interactive commands (like `top` or `nano`).
5. Commands run with a 30s timeout; long-running tasks should be broken into smaller steps.

**Signature:**
```typescript
await system.terminal_execute(args: SystemTerminal_executeArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | `string` | Yes | The bash command to run |
| `cwd` | `string` | No | Optional working directory (relative to repo root) |

**Usage Example:**
```typescript
// Call terminal_execute
await system.terminal_execute({ /* args */ });
```

---

### Tool: `system.search_codebase`
**Description:** Search the codebase for a string

**Signature:**
```typescript
await system.search_codebase(args: SystemSearch_codebaseArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes |  |

**Usage Example:**
```typescript
// Call search_codebase
await system.search_codebase({ /* args */ });
```

---

### Tool: `system.list_files_tree`
**Description:** List files in a tree structure

**Signature:**
```typescript
await system.list_files_tree(args: SystemList_files_treeArgs)
```

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|

**Usage Example:**
```typescript
// Call list_files_tree
await system.list_files_tree({ /* args */ });
```

---
