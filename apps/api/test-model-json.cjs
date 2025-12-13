const { selectModelFromRegistry } = require('./src/services/modelManager.service');

(async function main() {
  try {
    const result = await selectModelFromRegistry('test-role');
    if (!result) {
      console.error('❌ No model could be selected from JSON.');
      process.exit(1);
    }
    console.log('✅ Model selected from JSON:', result);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error during model selection:', e);
    process.exit(1);
  }
})();
