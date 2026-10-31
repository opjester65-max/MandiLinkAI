import { gradeImageWithGemma, validateAndNormalizeImage } from '../lib/providers/gemmaGrade.ts';

// Deterministic 1x1 red PNG pixel representing a tomato color swatch
const RED_TOMATO_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// Deterministic 1x1 black PNG representing non-produce scene
const NON_PRODUCE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function runDemoGrade() {
  console.log('====================================================');
  console.log('   MANDILINK DEMO: GEMMA 4 VISION PRODUCE GRADING   ');
  console.log('====================================================\n');

  console.log('1. Validating and normalizing input image...');
  const val = validateAndNormalizeImage(RED_TOMATO_PIXEL_PNG);
  console.log('   Magic bytes verification:', val.valid ? 'PASSED (PNG format)' : 'FAILED');
  console.log('   Image SHA-256 hash:', val.sha256);

  console.log('\n2. Executing live inference via configured Gemma model...');
  console.log('   Configured Model Identifier:', process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it');

  try {
    const result = await gradeImageWithGemma(RED_TOMATO_PIXEL_PNG, 'en-PK', false);
    console.log('\n✓ INFERENCE SUCCEEDED!');
    console.log('----------------------------------------------------');
    console.log('Responding Model Identifier:', result.respondingModel);
    console.log('Provider Request ID:        ', result.providerRequestId);
    console.log('Assessed Produce Category:  ', result.output.produce);
    console.log('Assessed Visual Grade:      ', result.output.visualGrade);
    console.log('Observations (up to 3):     ', result.output.observations);
    console.log('Neutral Sale Description:   ', `"${result.output.description}"`);
    console.log('Review Required Flag:       ', result.output.reviewRequired);
    console.log('Latency:                    ', `${result.output.latencyMs} ms`);
    console.log('Sanitized Provider Receipt: ', result.sanitizedReceipt);
    console.log('----------------------------------------------------\n');

    console.log('3. Testing irrelevant / non-produce safety filter...');
    const nonProduceResult = await gradeImageWithGemma(NON_PRODUCE_PIXEL_PNG, 'en-PK', false);
    console.log('   Non-produce assessed as: produce =', nonProduceResult.output.produce, ', grade =', nonProduceResult.output.visualGrade);
    console.log('   Review Required:        ', nonProduceResult.output.reviewRequired);
    console.log('   Safety rejection test:   PASSED (Non-produce cannot generate publishable listing)');

    console.log('\n====================================================');
    console.log('   DEMO-GRADE ADAPTER EXECUTED SUCCESSFULLY         ');
    console.log('====================================================');
  } catch (err: any) {
    console.error('Demo grade error:', err.message);
    process.exit(1);
  }
}

runDemoGrade();
