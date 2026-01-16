<script setup>
import { ref } from 'vue'

const props = defineProps({
  canvasRef: Object,
  constraints: Object
})

// Fixed export size (1:1 square to match preview)
const exportSize = { width: 1080, height: 1080, name: '1080×1080' }

const isExporting = ref(false)
const exportFormat = ref('png')

async function exportImage() {
  if (!props.canvasRef || isExporting.value) return

  isExporting.value = true

  try {
    const { width, height } = exportSize
    const dataUrl = await props.canvasRef.exportCanvas(width, height)

    const link = document.createElement('a')
    const filename = generateFilename()

    if (exportFormat.value === 'jpg') {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = props.constraints.background
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0)

        link.href = canvas.toDataURL('image/jpeg', 0.95)
        link.download = filename.replace('.png', '.jpg')
        link.click()
      }
      img.src = dataUrl
    } else {
      link.href = dataUrl
      link.download = filename
      link.click()
    }
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    isExporting.value = false
  }
}

function generateFilename() {
  const date = new Date().toISOString().slice(0, 10)
  const size = exportSize.name.toLowerCase().replace(/\s+/g, '-')
  return `context-${size}-${date}.png`
}

async function copyToClipboard() {
  if (!props.canvasRef || isExporting.value) return

  isExporting.value = true

  try {
    const { width, height } = exportSize
    const dataUrl = await props.canvasRef.exportCanvas(width, height)

    const response = await fetch(dataUrl)
    const blob = await response.blob()

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
  } catch (error) {
    console.error('Copy failed:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-panel">
    <div class="section-title">EXPORT</div>

    <!-- Format Selection -->
    <div class="format-row">
      <button
        class="format-btn"
        :class="{ active: exportFormat === 'png' }"
        @click="exportFormat = 'png'"
      >
        PNG
      </button>
      <button
        class="format-btn"
        :class="{ active: exportFormat === 'jpg' }"
        @click="exportFormat = 'jpg'"
      >
        JPG
      </button>
    </div>

    <!-- Export Actions -->
    <div class="actions">
      <button class="btn" @click="exportImage" :disabled="isExporting">
        {{ isExporting ? 'EXPORTING...' : '↓ DOWNLOAD' }}
      </button>
      <button class="btn" @click="copyToClipboard" :disabled="isExporting">
        ⎘ COPY
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: 12px;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}

.format-row {
  display: flex;
  gap: var(--space-xs);
}

.format-btn {
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-mono);
}

.format-btn:hover {
  color: var(--color-fg);
  border-color: var(--color-fg);
}

.format-btn.active {
  background: var(--color-fg);
  color: var(--color-bg);
  border-color: var(--color-fg);
}

.actions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.actions .btn {
  flex: 1;
}
</style>
