import { AutoTokenizer, CLIPTextModelWithProjection, AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers';
env.allowLocalModels = false;

async function test() {
  try {
    console.log("Loading text model...");
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
    const text_model = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    const inputs = tokenizer('this is a test');
    const { text_embeds } = await text_model(inputs);
    console.log('Text Success!', text_embeds.data.slice(0, 5));
  } catch (e) { console.error('Text Error:', e); }

  try {
    console.log("Loading vision model...");
    const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    const image = await RawImage.read('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cat.jpg');
    const image_inputs = await processor(image);
    const { image_embeds } = await vision_model(image_inputs);
    console.log('Image Success!', image_embeds.data.slice(0, 5));
  } catch (e) { console.error('Image Error:', e); }
}
test();
