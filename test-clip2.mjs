import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = true;
env.allowRemoteModels = false;

async function test() {
  try {
    const text_extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    const textOut = await text_extractor('this is a test');
    console.log('Text Success!', textOut.data.slice(0, 5));
  } catch (e) {
    console.error('Text Error:', e);
  }

  try {
    const image_extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    const imgOut = await image_extractor('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cat.jpg');
    console.log('Image Success!', imgOut.data.slice(0, 5));
  } catch (e) {
    console.error('Image Error:', e);
  }
}
test();
