import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = false;
async function test() {
  const extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
  try {
    const out = await extractor('this is a test');
    console.log('Success!', out);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
