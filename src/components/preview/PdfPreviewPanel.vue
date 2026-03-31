<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

const props = defineProps<{
  pdfUrl: string
}>()

type PageState = {
  pageNumber: number
  rendered: boolean
}

const panelRef = ref<HTMLDivElement | null>(null)
const pageStates = ref<PageState[]>([])
const totalPages = ref<number>(0)
const isLoading = ref<boolean>(false)
const loadError = ref<string>('')

let pdfDocument: PDFDocumentProxy | null = null
let observer: IntersectionObserver | null = null
let documentToken = 0

const renderedPages = new Set<number>()
const renderingTasks = new Map<number, RenderTask>()

function setPageRendered(pageNumber: number): void {
  pageStates.value = pageStates.value.map((page) =>
    page.pageNumber === pageNumber ? { ...page, rendered: true } : page,
  )
}

function getCanvasElement(pageNumber: number): HTMLCanvasElement | null {
  return panelRef.value?.querySelector(`[data-canvas-page="${pageNumber}"]`) ?? null
}

function getPageElement(pageNumber: number): HTMLDivElement | null {
  return panelRef.value?.querySelector(`[data-page-number="${pageNumber}"]`) ?? null
}

function resetCanvas(): void {
  panelRef.value?.querySelectorAll('canvas').forEach((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return
    }

    element.width = 0
    element.height = 0
    element.style.width = '0px'
    element.style.height = '0px'
  })
}

function clearRenderState(): void {
  observer?.disconnect()
  observer = null

  renderingTasks.forEach((task) => {
    task.cancel()
  })

  resetCanvas()
  renderingTasks.clear()
  renderedPages.clear()
  pageStates.value = []
  totalPages.value = 0
}

async function destroyCurrentDocument(): Promise<void> {
  if (!pdfDocument) {
    return
  }

  const currentDocument = pdfDocument
  pdfDocument = null

  await currentDocument.destroy()
}

async function renderPage(pageNumber: number, token: number): Promise<void> {
  if (!pdfDocument || token !== documentToken) {
    return
  }

  if (renderedPages.has(pageNumber) || renderingTasks.has(pageNumber)) {
    return
  }

  const canvas = getCanvasElement(pageNumber)

  if (!canvas) {
    loadError.value = `Canvas for page ${pageNumber} is not ready.`
    return
  }

  let page: PDFPageProxy | null = null

  try {
    page = await pdfDocument.getPage(pageNumber)

    if (token !== documentToken) {
      return
    }

    const viewport = page.getViewport({ scale: 1.15 })
    const context = canvas.getContext('2d', { alpha: false })

    if (!context) {
      loadError.value = 'Canvas context is unavailable.'
      return
    }

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    canvas.style.width = `${Math.ceil(viewport.width)}px`
    canvas.style.height = `${Math.ceil(viewport.height)}px`

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    })

    renderingTasks.set(pageNumber, renderTask)
    await renderTask.promise

    if (token !== documentToken) {
      return
    }

    renderedPages.add(pageNumber)
    setPageRendered(pageNumber)
  } catch (error: unknown) {
    const isRenderingCancelled =
      error instanceof Error &&
      (error.name === 'RenderingCancelledException' || error.message.includes('cancel'))

    if (!isRenderingCancelled && token === documentToken) {
      loadError.value = error instanceof Error ? error.message : 'Unable to render this PDF page.'
    }
  } finally {
    renderingTasks.delete(pageNumber)
    page?.cleanup()
  }
}

function setupObserver(token: number): void {
  observer?.disconnect()

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }

        const pageNumber = Number(entry.target.getAttribute('data-page-number'))

        if (Number.isNaN(pageNumber)) {
          return
        }

        void renderPage(pageNumber, token)
        observer?.unobserve(entry.target)
      })
    },
    {
      root: null,
      rootMargin: '700px 0px',
      threshold: 0.01,
    },
  )

  pageStates.value.forEach((page) => {
    if (renderedPages.has(page.pageNumber)) {
      return
    }

    const pageElement = getPageElement(page.pageNumber)

    if (pageElement) {
      observer?.observe(pageElement)
    }
  })
}

async function loadPdf(url: string): Promise<void> {
  documentToken += 1
  const token = documentToken

  isLoading.value = true
  loadError.value = ''

  clearRenderState()
  await destroyCurrentDocument()

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
    }

    const pdfBuffer = await response.arrayBuffer()

    if (token !== documentToken) {
      return
    }

    const loadingTask = getDocument({
      data: new Uint8Array(pdfBuffer),
    })
    const document = await loadingTask.promise

    if (token !== documentToken) {
      await document.destroy()
      return
    }

    pdfDocument = document
    totalPages.value = document.numPages
    pageStates.value = Array.from({ length: document.numPages }, (_, index) => ({
      pageNumber: index + 1,
      rendered: false,
    }))

    // Let Vue mount all page wrappers and canvases before the first render starts.
    isLoading.value = false
    await nextTick()

    const initialPages = Math.min(3, document.numPages)

    for (let index = 0; index < initialPages; index += 1) {
      await renderPage(index + 1, token)
    }

    if (token !== documentToken) {
      return
    }

    setupObserver(token)
  } catch (error: unknown) {
    if (token === documentToken) {
      loadError.value = error instanceof Error ? error.message : 'Unable to load PDF.'
    }
  } finally {
    if (token === documentToken && isLoading.value) {
      isLoading.value = false
    }
  }
}

watch(
  () => props.pdfUrl,
  (url) => {
    void loadPdf(url)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearRenderState()
  void destroyCurrentDocument()
})
</script>

<template>
  <div ref="panelRef" class="pdf-viewer-panel">
    <div class="viewer-status">
      <span>File: {{ props.pdfUrl }}</span>
      <span v-if="totalPages > 0">Pages: {{ totalPages }}</span>
    </div>

    <div v-if="isLoading" class="viewer-message">Loading PDF...</div>
    <div v-else-if="loadError" class="viewer-message viewer-error">{{ loadError }}</div>
    <div v-else class="pdf-container">
      <div
        v-for="page in pageStates"
        :key="page.pageNumber"
        :data-page-number="page.pageNumber"
        class="page-wrapper"
      >
        <div class="page-header">Page {{ page.pageNumber }} / {{ totalPages }}</div>
        <canvas :data-canvas-page="page.pageNumber" />
        <div v-if="!page.rendered" class="page-placeholder">Rendering page {{ page.pageNumber }}...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-panel {
  min-width: max-content;
  min-height: 100%;
}

.viewer-status {
  display: flex;
  gap: 16px;
  padding: 12px 16px 0;
  font-size: 12px;
  color: #475569;
}

.viewer-message {
  padding: 24px;
  color: #334155;
}

.viewer-error {
  color: #b91c1c;
}

.pdf-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: max-content;
  padding: 16px;
}

.page-wrapper {
  position: relative;
  margin-bottom: 16px;
  min-width: 820px;
  min-height: 1160px;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
  overflow: hidden;
}

.page-header {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  background: #f8fafc;
}

.page-placeholder {
  position: absolute;
  inset: 41px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.9), rgba(248, 250, 252, 0.95));
}

canvas {
  display: block;
  margin: 0 auto;
  background: #ffffff;
}
</style>
