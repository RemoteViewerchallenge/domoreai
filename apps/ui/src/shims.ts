console.log('!!! ESM SHIM LOADED !!!');

export const performance = globalThis.performance || { now: () => Date.now() };
export const platform = () => 'browser';
export const release = () => '1.0.0';
export const type = () => 'Browser';
export const EOL = '\n';
export const homedir = () => '/';
export const tmpdir = () => '/tmp';
export const endianness = () => 'LE';
export const arch = () => 'x64';

export const join = (...args: any[]) => args.filter(Boolean).join('/');
export const resolve = (...args: any[]) => args.filter(Boolean).join('/');
export const basename = (p: any) => p.split('/').pop();
export const dirname = (p: any) => p.split('/').slice(0, -1).join('/') || '.';
export const extname = (p: any) => {
  const base = p.split('/').pop();
  if (!base || !base.includes('.')) return '';
  return '.' + base.split('.').pop();
};
export const sep = '/';
export const delimiter = ':';

// Mock realpathSync to prevent "native" access crash
// explicit typing to any to avoid TS errors
export const realpathSync: any = Object.assign(() => '', {
    native: () => '' // Define native as a function to be safe
});

export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const statSync = () => ({ isDirectory: () => false, isFile: () => false });

export const promises = {
  readFile: async () => '',
  writeFile: async () => {},
  realpath: async () => '',
};

// Default export to handle "import fs from 'fs'"
export default {
    performance,
    platform,
    release,
    type,
    EOL,
    homedir,
    tmpdir,
    endianness,
    arch,
    join,
    resolve,
    basename,
    dirname,
    extname,
    sep,
    delimiter,
    realpathSync,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    statSync,
    promises
};
