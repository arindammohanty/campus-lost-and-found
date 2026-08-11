import { env, AutoTokenizer, CLIPTextModelWithProjection, AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers'

env.allowLocalModels = false

class PipelineSingleton {
  static model = 'Xenova/clip-vit-base-patch32'
  
  static textExtractor: Promise<any> | null = null
  static imageExtractor: Promise<any> | null = null

  static async getTextExtractor(progress_callback?: (msg: any) => void) {
    if (this.textExtractor === null) {
      this.textExtractor = (async () => {
        const tokenizer = await AutoTokenizer.from_pretrained(this.model, { progress_callback })
        const model = await CLIPTextModelWithProjection.from_pretrained(this.model, { progress_callback, dtype: 'q8' })
        return [tokenizer, model]
      })()
    }
    return this.textExtractor
  }

  static async getImageExtractor(progress_callback?: (msg: any) => void) {
    if (this.imageExtractor === null) {
      this.imageExtractor = (async () => {
        const processor = await AutoProcessor.from_pretrained(this.model, { progress_callback })
        const model = await CLIPVisionModelWithProjection.from_pretrained(this.model, { progress_callback, dtype: 'q8' })
        return [processor, model]
      })()
    }
    return this.imageExtractor
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, payload, id } = event.data

  if (type === 'load') {
    try {
      await PipelineSingleton.getTextExtractor((x) => {
        self.postMessage({ status: 'progress', data: x })
      })
      await PipelineSingleton.getImageExtractor((x) => {
        self.postMessage({ status: 'progress', data: x })
      })
      self.postMessage({ status: 'ready' })
    } catch (err) {
      self.postMessage({ status: 'error', error: String(err) })
    }
    return
  }

  if (type !== 'text' && type !== 'image') {
    return
  }

  try {
    let embedding;

    if (type === 'text') {
      const [tokenizer, model] = await PipelineSingleton.getTextExtractor((x) => {
        self.postMessage({ status: 'progress', data: x })
      })
      
      const inputs = tokenizer(payload)
      const { text_embeds } = await model(inputs)
      embedding = Array.from(text_embeds.data)
      
    } else if (type === 'image') {
      const [processor, model] = await PipelineSingleton.getImageExtractor((x) => {
        self.postMessage({ status: 'progress', data: x })
      })
      
      // Read image using RawImage to support Data URLs, Blobs, etc.
      const image = await RawImage.read(payload)
      const inputs = await processor(image)
      const { image_embeds } = await model(inputs)
      embedding = Array.from(image_embeds.data)
    }

    self.postMessage({ status: 'ready' })

    self.postMessage({
      status: 'complete',
      id,
      embedding: new Float32Array(embedding!),
    })
  } catch (error: any) {
    self.postMessage({ status: 'error', id, error: error.message || String(error) })
  }
})
