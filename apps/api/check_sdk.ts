
import * as sdk from '@utcp/sdk';
console.log('SDK Exports:', Object.keys(sdk));
// Try to inspect CallTemplate if it exists
// @ts-ignore
if (sdk.CallTemplate) {
    // @ts-ignore
    console.log('CallTemplate:', sdk.CallTemplate);
}
