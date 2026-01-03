// apps/ui/src/shims.ts
console.log('!!! LOADED ROBUST SHIM !!!');

// 1. Define the critical function causing the crash
const realpathSync = Object.assign(() => "/", {
  native: () => "/" // <--- This prevents the "reading 'native'" crash
});

// 2. Define other common fs/path methods to prevent other crashes
const noop = () => {};
const noopAsync = async () => {};
const returnEmpty = () => "";
const returnFalse = () => false;
const returnObj = () => ({});

const promises = {
  readFile: noopAsync,
  writeFile: noopAsync,
  realpath: noopAsync,
  mkdir: noopAsync,
  stat: async () => ({ isDirectory: returnFalse, isFile: returnFalse }),
};

const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
};

// 3. Export specific named exports (ESM style)
export { 
    realpathSync, 
    promises,
    constants 
};

export const readFileSync = returnEmpty;
export const writeFileSync = noop;
export const existsSync = returnFalse;
export const mkdirSync = noop;
export const statSync = () => ({ isDirectory: returnFalse, isFile: returnFalse });
export const watch = noop;

// Path/OS exports
export const join = (...args: any[]) => args.filter(Boolean).join('/');
export const resolve = (...args: any[]) => args.filter(Boolean).join('/');
export const basename = (p: any) => p ? p.split('/').pop() : '';
export const dirname = (p: any) => p ? p.split('/').slice(0, -1).join('/') || '.' : '.';
export const extname = (p: any) => p ? '.' + p.split('.').pop() : '';
export const sep = '/';
export const delimiter = ':';
export const platform = () => 'browser';
export const homedir = () => '/';
export const tmpdir = () => '/tmp';
export const EOL = '\n';
export const release = () => '1.0.0';
export const type = () => 'Browser';
export const endianness = () => 'LE';
export const arch = () => 'x64';

// 4. Default Export (CJS style compatibility)
// This is what 'require("fs")' often resolves to in Vite bundles
export default {
  realpathSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
  watch,
  promises,
  constants,
  join,
  resolve,
  basename,
  dirname,
  extname,
  sep,
  delimiter,
  platform,
  homedir,
  tmpdir,
  EOL,
  release,
  type,
  endianness,
  arch
};
