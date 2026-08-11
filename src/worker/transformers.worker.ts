import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers'

env.allowLocalModels = false

class PipelineSingleton {
  static task = 'feature-extraction' as const
  static model = 'Xenova/clip-vit-base-patch32'
  static instance: Promise<FeatureExtractionPipeline> | null = null

  static async getInstance(progress_callback?: (msg: any) => void) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
        dtype: 'q8', // specify 8-bit quantization
      }) as Promise<FeatureExtractionPipeline>
    }
    return this.instance
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, payload, id } = event.data

  if (type === 'load') {
    // Attempt to load the pipeline ahead of time
    try {
      await PipelineSingleton.getInstance((x) => {
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
    const extractor = await PipelineSingleton.getInstance((x) => {
      self.postMessage({ status: 'progress', data: x })
    })

    self.postMessage({ status: 'ready' })

    const result = await extractor(payload)
    
    // Convert Tensor to Float32Array
    const embedding = Array.from(result.data)

    self.postMessage({
      status: 'complete',
      id,
      embedding: new Float32Array(embedding),
    })
  } catch (error) {
    self.postMessage({ status: 'error', id, error: String(error) })
  }
})
