import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = false;

async function test() {
  try {
    const extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    console.log(Object.keys(extractor.model.__proto__));
  } catch (e) { console.error('Error:', e); }
}
test();
