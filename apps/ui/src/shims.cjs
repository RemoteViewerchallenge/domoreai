// apps/ui/src/shims.cjs
console.log('!!! CJS SHIM LOADED !!!');

const performance = globalThis.performance || { now: () => Date.now() };

const platform = () => 'browser';
const release = () => '1.0.0';
const type = () => 'Browser';
const EOL = '\n';
const homedir = () => '/';
const tmpdir = () => '/tmp';
const endianness = () => 'LE';
const arch = () => 'x64';

const join = (...args) => args.filter(Boolean).join('/');
const resolve = (...args) => args.filter(Boolean).join('/');
const basename = (p) => p.split('/').pop();
const dirname = (p) => p.split('/').slice(0, -1).join('/') || '.';
const extname = (p) => {
  const base = p.split('/').pop();
  if (!base || !base.includes('.')) return '';
  return '.' + base.split('.').pop();
};
const sep = '/';
const delimiter = ':';

const readFileSync = () => '';
const writeFileSync = () => {};
const existsSync = () => false;
const mkdirSync = () => {};
const statSync = () => ({ isDirectory: () => false, isFile: () => false });

const realpathSync = () => '';
// Add native property to realpathSync function object to prevent TS crash
realpathSync.native = undefined;

const promises = {
  readFile: async () => '',
  writeFile: async () => {},
  realpath: async () => '',
};

const _exports = {
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
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    statSync,
    realpathSync,
    promises
};

module.exports = _exports;
