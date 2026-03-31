<script setup lang="ts">
import { computed, ref } from 'vue'

import PdfPreviewPanel from '@/components/preview/PdfPreviewPanel.vue'
import PdfToolbar from '@/components/preview/PdfToolbar.vue'
import WebsitePreviewPanel from '@/components/preview/WebsitePreviewPanel.vue'

type PdfItem = {
  id: number
  name: string
  url: string
}

const pdfList: PdfItem[] = [
  { id: 1, name: 'sample-local-pdf.pdf', url: '/pdfs/sample-local-pdf.pdf' },
  { id: 2, name: 'sample.pdf', url: '/pdfs/sample.pdf' },
]

// Keep all page-level state here and only pass data down via props.
const defaultPdf = pdfList[0]!
const activePdfId = ref<number>(defaultPdf.id)

const activePdf = computed<PdfItem>(() => {
  return pdfList.find((item) => item.id === activePdfId.value) ?? defaultPdf
})

function handlePdfChange(pdf: PdfItem): void {
  activePdfId.value = pdf.id
}
</script>

<template>
  <div class="page">
    <section class="left-panel">
      <WebsitePreviewPanel />
    </section>

    <section class="right-panel">
      <div class="right-toolbar">
        <PdfToolbar :pdf-list="pdfList" :active-id="activePdfId" @change="handlePdfChange" />
      </div>

      <div class="right-viewer">
        <PdfPreviewPanel :pdf-url="activePdf.url" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-right: 1px solid #ddd;
  background: #f8fafc;
}

.right-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eef2f7;
}

.right-toolbar {
  flex: 0 0 64px;
  min-height: 64px;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
  overflow-y: hidden;
  background: #fff;
}

.right-viewer {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
</style>
