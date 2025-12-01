import { decrypt } from './encryption.js';

console.log('Testing decrypt with invalid data...');

try {
  decrypt('invalid:data');
  console.error('FAIL: decrypt should have thrown an error');
} catch (e: any) {
  console.log('PASS: decrypt threw an error as expected:', e.message);
}

try {
  decrypt('invalid_format');
  console.error('FAIL: decrypt should have thrown an error for invalid format');
} catch (e: any) {
  console.log('PASS: decrypt threw an error for invalid format:', e.message);
}
