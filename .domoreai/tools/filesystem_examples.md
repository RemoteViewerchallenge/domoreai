# Filesystem Tool Usage Examples

## Read Files
Read the contents of files from the filesystem.

```typescript
// Read a text file
const content = await filesystem.readFile('/path/to/file.txt', 'utf-8');

// Read JSON file
const data = JSON.parse(await filesystem.readFile('/path/to/data.json', 'utf-8'));

// Read binary file
const buffer = await filesystem.readFile('/path/to/image.png');
```

## Write Files
Create or update files.

```typescript
// Write text to a file
await filesystem.writeFile('/path/to/output.txt', 'Hello, World!', 'utf-8');

// Write JSON data
await filesystem.writeFile(
  '/path/to/config.json', 
  JSON.stringify(config, null, 2), 
  'utf-8'
);

// Append to a file
await filesystem.appendFile('/path/to/log.txt', 'New log entry\n', 'utf-8');
```

## List Directory Contents
Get a list of files and directories.

```typescript
// List all files in a directory
const files = await filesystem.readdir('/path/to/directory');

// List with file details
const entries = await filesystem.readdir('/path/to/directory', { withFileTypes: true });
for (const entry of entries) {
  console.log(`${entry.name} - ${entry.isDirectory() ? 'DIR' : 'FILE'}`);
}
```

## Create Directories
Make new directories.

```typescript
// Create a single directory
await filesystem.mkdir('/path/to/new/directory');

// Create nested directories
await filesystem.mkdir('/path/to/nested/dirs', { recursive: true });
```

## Delete Files and Directories
Remove files or directories.

```typescript
// Delete a file
await filesystem.unlink('/path/to/file.txt');

// Delete an empty directory
await filesystem.rmdir('/path/to/directory');

// Delete directory and all contents
await filesystem.rm('/path/to/directory', { recursive: true, force: true });
```

## Check File/Directory Existence
Verify if a path exists.

```typescript
// Check if file exists
const exists = await filesystem.exists('/path/to/file.txt');

// Get file stats
const stats = await filesystem.stat('/path/to/file.txt');
console.log(`Size: ${stats.size} bytes`);
console.log(`Is directory: ${stats.isDirectory()}`);
console.log(`Modified: ${stats.mtime}`);
```

## Copy and Move Files
Duplicate or relocate files.

```typescript
// Copy a file
await filesystem.copyFile('/source/file.txt', '/destination/file.txt');

// Move/rename a file
await filesystem.rename('/old/path/file.txt', '/new/path/file.txt');
```

## Watch for Changes
Monitor files for modifications.

```typescript
// Watch a file for changes
const watcher = filesystem.watch('/path/to/file.txt', (eventType, filename) => {
  console.log(`File ${filename} changed: ${eventType}`);
});

// Stop watching
watcher.close();
```

## Get Current Working Directory
Find out the current directory.

```typescript
const cwd = process.cwd();
console.log(`Current directory: ${cwd}`);
```
