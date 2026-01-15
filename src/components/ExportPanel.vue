<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  canvasRef: Object,
  sizes: Array,
  selectedSize: Object,
  constraints: Object
})

const emit = defineEmits(['update:selectedSize'])

const isExporting = ref(false)
const exportFormat = ref('png')

const formats = [
  { id: 'png', name: 'PNG', description: 'Best for sharing' },
  { id: 'jpg', name: 'JPG', description: 'Smaller file size' }
]

async function exportImage() {
  if (!props.canvasRef || isExporting.value) return

  isExporting.value = true

  try {
    const { width, height } = props.selectedSize
    const dataUrl = await props.canvasRef.exportCanvas(width, height)

    // Create download link
    const link = document.createElement('a')
    const filename = generateFilename()

    if (exportFormat.value === 'jpg') {
      // Convert PNG to JPG
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Fill with background color for JPG (no transparency)
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
  const size = props.selectedSize.name.toLowerCase().replace(/\s+/g, '-')
  return `context-${size}-${date}.png`
}

async function copyToClipboard() {
  if (!props.canvasRef || isExporting.value) return

  isExporting.value = true

  try {
    const { width, height } = props.selectedSize
    const dataUrl = await props.canvasRef.exportCanvas(width, height)

    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])

    // Show feedback
    alert('Image copied to clipboard!')
  } catch (error) {
    console.error('Copy failed:', error)
    alert('Failed to copy image. Try downloading instead.')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-panel card">
    <h3 class="panel-title">Export</h3>

    <!-- Size Selection -->
    <div class="section">
      <label>Size</label>
      <div class="size-grid">
        <button
          v-for="size in sizes"
          :key="size.name"
          class="size-btn"
          :class="{ active: selectedSize.name === size.name }"
          @click="emit('update:selectedSize', size)"
        >
          <span class="size-name">{{ size.name }}</span>
          <span class="size-dims">{{ size.width }} × {{ size.height }}</span>
        </button>
      </div>
    </div>

    <!-- Format Selection -->
    <div class="section">
      <label>Format</label>
      <div class="format-options">
        <button
          v-for="format in formats"
          :key="format.id"
          class="format-btn"
          :class="{ active: exportFormat === format.id }"
          @click="exportFormat = format.id"
        >
          <span class="format-name">{{ format.name }}</span>
          <span class="format-desc">{{ format.description }}</span>
        </button>
      </div>
    </div>

    <!-- Export Actions -->
    <div class="section actions">
      <button
        class="btn btn-primary btn-lg w-full"
        @click="exportImage"
        :disabled="isExporting"
      >
        <svg v-if="!isExporting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
        </svg>
        {{ isExporting ? 'Exporting...' : 'Download' }}
      </button>

      <button
        class="btn w-full"
        @click="copyToClipboard"
        :disabled="isExporting"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Copy to Clipboard
      </button>
    </div>

    <!-- Current Constraints Summary -->
    <div class="constraints-summary">
      <div class="constraint-item">
        <span class="constraint-color" :style="{ background: constraints.foreground }"></span>
        <span class="text-mono">{{ constraints.foreground }}</span>
      </div>
      <div class="constraint-item">
        <span class="constraint-color" :style="{ background: constraints.background }"></span>
        <span class="text-mono">{{ constraints.background }}</span>
      </div>
      <div class="constraint-item">
        <span :style="{ fontFamily: constraints.typeface }">{{ constraints.typeface }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  position: relative;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.section {
  margin-bottom: var(--space-md);
}

.section:last-child {
  margin-bottom: 0;
}

/* Size Grid */
.size-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.size-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-fg);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.size-btn:hover {
  border-color: var(--color-accent);
}

.size-btn.active {
  background: var(--color-fg);
  color: var(--color-bg);
  border-color: var(--color-fg);
}

.size-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.size-dims {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  opacity: 0.7;
}

/* Format Options */
.format-options {
  display: flex;
  gap: var(--space-sm);
}

.format-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-fg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.format-btn:hover {
  border-color: var(--color-accent);
}

.format-btn.active {
  background: var(--color-fg);
  color: var(--color-bg);
  border-color: var(--color-fg);
}

.format-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.format-desc {
  font-size: 0.625rem;
  opacity: 0.7;
  margin-top: 2px;
}

/* Actions */
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

/* Constraints Summary */
.constraints-summary {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.constraint-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.75rem;
  color: var(--color-accent);
}

.constraint-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--color-border);
}

/* Spin animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
