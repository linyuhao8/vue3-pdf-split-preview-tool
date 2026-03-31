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

// 告訴 PDF.js 在瀏覽器端要使用哪一個 worker 檔案處理 PDF 解析。
GlobalWorkerOptions.workerSrc = pdfWorker

const props = defineProps<{
  pdfUrl: string
}>()

type PageState = {
  pageNumber: number
  rendered: boolean
}

// 這個元件會直接操作內部 DOM，因此保留外層容器 ref 方便查找 canvas / page wrapper。
const panelRef = ref<HTMLDivElement | null>(null)
const pageStates = ref<PageState[]>([])
const totalPages = ref<number>(0)
const isLoading = ref<boolean>(false)
const loadError = ref<string>('')

// 這裡存放目前 PDF.js 載入後的文件實例，以及 lazy render 觀察器。
let pdfDocument: PDFDocumentProxy | null = null
let observer: IntersectionObserver | null = null

// 每次切換 PDF 都遞增 token，避免舊請求回來後覆蓋新畫面。
let documentToken = 0

// 用來避免重複 render 同一頁，也方便切換文件時統一取消未完成任務。
const renderedPages = new Set<number>()
const renderingTasks = new Map<number, RenderTask>()

function setPageRendered(pageNumber: number): void {
  // 某頁渲染成功後，把狀態改成 rendered，讓 placeholder 消失。
  pageStates.value = pageStates.value.map((page) =>
    page.pageNumber === pageNumber ? { ...page, rendered: true } : page,
  )
}

function getCanvasElement(pageNumber: number): HTMLCanvasElement | null {
  // 依頁碼找對應 canvas，讓每頁都能畫到自己的 DOM 節點上。
  return panelRef.value?.querySelector(`[data-canvas-page="${pageNumber}"]`) ?? null
}

function getPageElement(pageNumber: number): HTMLDivElement | null {
  // 依頁碼找外層 page wrapper，給 IntersectionObserver 做 lazy render 目標。
  return panelRef.value?.querySelector(`[data-page-number="${pageNumber}"]`) ?? null
}

function resetCanvas(): void {
  // 清空所有 canvas 尺寸，避免切換 PDF 時殘留上一份內容。
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
  // 切換 PDF 前先停止 observer，避免舊頁面持續觸發 lazy render。
  observer?.disconnect()
  observer = null

  // 取消所有還在進行中的 render task，避免新舊文件互相干擾。
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
  // 切換 PDF 時銷毀舊文件，避免記憶體與狀態殘留。
  if (!pdfDocument) {
    return
  }

  const currentDocument = pdfDocument
  pdfDocument = null

  await currentDocument.destroy()
}

async function renderPage(pageNumber: number, token: number): Promise<void> {
  // 如果文件已經切換，或這頁正在 render / render 過，就直接跳過。
  if (!pdfDocument || token !== documentToken) {
    return
  }

  if (renderedPages.has(pageNumber) || renderingTasks.has(pageNumber)) {
    return
  }

  const canvas = getCanvasElement(pageNumber)

  if (!canvas) {
    // 這通常代表 DOM 還沒準備好，所以無法把 PDF 頁面畫上去。
    loadError.value = `Canvas for page ${pageNumber} is not ready.`
    return
  }

  let page: PDFPageProxy | null = null

  try {
    page = await pdfDocument.getPage(pageNumber)

    if (token !== documentToken) {
      return
    }

    // 固定縮放倍率，讓畫面穩定，並保留橫向捲動空間。
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

    // PDF.js 會把這一頁內容真正畫到 canvas 上。
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

    // 成功 render 後記錄狀態，避免重複畫同一頁。
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
    // 不論成功或失敗，都要把 task 移除，避免狀態卡住。
    renderingTasks.delete(pageNumber)
    page?.cleanup()
  }
}

function setupObserver(token: number): void {
  // 每次重新載入文件時都重建 observer，確保觀察目標是最新的頁面 DOM。
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

        // 當頁面接近可視區時，才開始 render，避免一次畫完整份 PDF。
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

  // 把還沒 render 的頁面都交給 observer 監看。
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
  // 每次接到新 URL，就視為一次新的載入任務。
  documentToken += 1
  const token = documentToken

  isLoading.value = true
  loadError.value = ''

  // 先清掉舊狀態，再銷毀舊文件。
  clearRenderState()
  await destroyCurrentDocument()

  try {
    // 先把 PDF 抓成二進位資料，再交給 PDF.js 解析。
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

    // 建立每一頁的 placeholder 狀態，讓模板先把 page wrapper 與 canvas 畫出來。
    pageStates.value = Array.from({ length: document.numPages }, (_, index) => ({
      pageNumber: index + 1,
      rendered: false,
    }))

    // 先讓 Vue 把 canvas 掛進 DOM，再開始 render，避免找不到 canvas。
    isLoading.value = false
    await nextTick()

    // 先渲染前 3 頁，讓使用者一進來就看到內容。
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
    // 父層一旦切換 pdfUrl，就重新走完整個載入流程。
    void loadPdf(url)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  // 元件離開畫面前，確保 observer / render task / document 都被清乾淨。
  clearRenderState()
  void destroyCurrentDocument()
})
</script>

<template>
  <div ref="panelRef" class="pdf-viewer-panel">
    <!-- 顯示目前載入哪個檔案與總頁數，方便除錯與確認切換結果。 -->
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
        <!-- 每一頁都會有自己的 header、canvas 與 placeholder。 -->
        <div class="page-header">Page {{ page.pageNumber }} / {{ totalPages }}</div>
        <canvas :data-canvas-page="page.pageNumber" />
        <div v-if="!page.rendered" class="page-placeholder">Rendering page {{ page.pageNumber }}...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-panel {
  /* 讓 PDF 預覽區保留足夠寬度，必要時由外層 viewer 負責水平捲動。 */
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
  /* 使用 max-content 讓寬頁 PDF 不會被硬壓縮。 */
  min-width: max-content;
  padding: 16px;
}

.page-wrapper {
  position: relative;
  margin-bottom: 16px;
  /* 先給一個基本頁面尺寸，讓 placeholder 在 render 前也有穩定高度。 */
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
