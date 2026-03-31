<script setup lang="ts">
type PdfItem = {
  id: number
  name: string
  url: string
}

const props = defineProps<{
  pdfList: PdfItem[]
  activeId: number
}>()

const emit = defineEmits<{
  (e: 'change', pdf: PdfItem): void
}>()

function handleClick(pdf: PdfItem): void {
  emit('change', pdf)
}

function handleSelect(value: number | null): void {
  const target = props.pdfList.find((item) => item.id === value)

  if (target) {
    emit('change', target)
  }
}
</script>

<template>
  <div class="toolbar-shell">
    <div class="toolbar-title-group">
      <div class="toolbar-title">Choose PDF</div>
      <div class="toolbar-subtitle">Switch files from the dropdown or quick buttons.</div>
    </div>

    <div class="toolbar-select">
      <v-select
        :items="props.pdfList"
        :model-value="props.activeId"
        density="compact"
        hide-details
        item-title="name"
        item-value="id"
        label="PDF file"
        variant="outlined"
        @update:model-value="handleSelect"
      />
    </div>

    <div class="toolbar-list">
      <button
        v-for="pdf in props.pdfList"
        :key="pdf.id"
        :class="['toolbar-button', { 'toolbar-button-active': pdf.id === props.activeId }]"
        type="button"
        @click="handleClick(pdf)"
      >
        {{ pdf.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-shell {
  height: 100%;
  min-width: max-content;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: linear-gradient(90deg, #ffffff, #f8fafc);
}

.toolbar-title-group {
  flex: 0 0 auto;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.toolbar-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
}

.toolbar-select {
  flex: 0 0 240px;
}

.toolbar-list {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: max-content;
}

.toolbar-button {
  flex: 0 0 auto;
  min-width: 108px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.toolbar-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.toolbar-button-active {
  border-color: #1976d2;
  background: #1976d2;
  color: #ffffff;
}
</style>
