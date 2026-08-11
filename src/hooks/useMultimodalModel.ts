'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export function useMultimodalModel() {
  const worker = useRef<Worker | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  
  // Keep track of pending promises
  const promises = useRef<{ [id: string]: { resolve: (val: Float32Array) => void, reject: (err: any) => void } }>({})
  const msgId = useRef(0)

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('../worker/transformers.worker.ts', import.meta.url), {
        type: 'module',
      })

      const onMessageReceived = (e: MessageEvent) => {
        const { status, data, id, embedding, error } = e.data

        switch (status) {
          case 'progress':
            setIsModelLoading(true)
            setLoadingProgress(data)
            break
          case 'ready':
            setIsReady(true)
            setIsModelLoading(false)
            break
          case 'complete':
            if (id !== undefined && promises.current[id]) {
              promises.current[id].resolve(embedding)
              delete promises.current[id]
            }
            break
          case 'error':
            if (id !== undefined && promises.current[id]) {
              promises.current[id].reject(error)
              delete promises.current[id]
            }
            break
        }
      }

      worker.current.addEventListener('message', onMessageReceived)
      
      // trigger a load
      worker.current.postMessage({ type: 'load' })
      
      return () => {
        worker.current?.removeEventListener('message', onMessageReceived)
        worker.current?.terminate()
        worker.current = null
      }
    }
  }, [])

  const generateTextEmbedding = useCallback((text: string): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      if (!worker.current) {
        return reject(new Error('Worker not initialized'))
      }
      const id = String(msgId.current++)
      promises.current[id] = { resolve, reject }
      worker.current.postMessage({ type: 'text', payload: text, id })
    })
  }, [])

  const generateImageEmbedding = useCallback((imageUrl: string): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      if (!worker.current) {
        return reject(new Error('Worker not initialized'))
      }
      const id = String(msgId.current++)
      promises.current[id] = { resolve, reject }
      worker.current.postMessage({ type: 'image', payload: imageUrl, id })
    })
  }, [])

  return {
    isModelLoading,
    loadingProgress,
    isReady,
    generateTextEmbedding,
    generateImageEmbedding,
  }
}
