<script setup>
import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue'
import p5 from 'p5'
import { generateP5Code } from '../services/geminiService'

const props = defineProps({
  constraints: Object,
  prompt: String,
  exportSize: Object,
  apiKey: String
})

const emit = defineEmits(['canvas-ready', 'save'])

const canvasContainer = ref(null)
const canvasWrapper = ref(null)
const isGenerating = ref(false)
const aiGeneratedCode = ref('')
const aiError = ref('')

// Save state
const saveName = ref('')
const isSaving = ref(false)

// History of generated visuals
const generationHistory = ref([])
const historyIndex = ref(-1)

// Labels system
const labels = ref([])
const selectedLabel = ref(null)
const editingLabel = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const labelStart = reactive({ x: 0, y: 0, scale: 1 })

// Snap guides
const snapThreshold = 2 // percentage threshold for snapping
const activeSnapGuides = reactive({ x: null, y: null })

let p5Instance = null

// Computed properties for history navigation
const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < generationHistory.value.length - 1)

// Add a new label
function addLabel() {
  const newLabel = {
    id: Date.now(),
    text: 'LABEL',
    x: 50, // percentage
    y: 50,
    scale: 1,
    align: 'center'
  }
  labels.value.push(newLabel)
  selectedLabel.value = newLabel.id
  editingLabel.value = newLabel.id
}

// Delete selected label
function deleteLabel(id) {
  labels.value = labels.value.filter(l => l.id !== id)
  if (selectedLabel.value === id) {
    selectedLabel.value = null
  }
}

// Start dragging a label
function startDrag(e, label) {
  if (editingLabel.value === label.id) return
  e.preventDefault()
  selectedLabel.value = label.id
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  labelStart.x = label.x
  labelStart.y = label.y

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e) {
  if (!isDragging.value || !canvasWrapper.value) return

  const rect = canvasWrapper.value.getBoundingClientRect()
  const dx = ((e.clientX - dragStart.x) / rect.width) * 100
  const dy = ((e.clientY - dragStart.y) / rect.height) * 100

  const label = labels.value.find(l => l.id === selectedLabel.value)
  if (label) {
    let newX = Math.max(0, Math.min(100, labelStart.x + dx))
    let newY = Math.max(0, Math.min(100, labelStart.y + dy))

    // Reset snap guides
    activeSnapGuides.x = null
    activeSnapGuides.y = null

    // Get positions of other labels for snapping
    const otherLabels = labels.value.filter(l => l.id !== label.id)

    // Check for horizontal alignment (same Y)
    for (const other of otherLabels) {
      if (Math.abs(newY - other.y) < snapThreshold) {
        newY = other.y
        activeSnapGuides.y = other.y
        break
      }
    }

    // Check for vertical alignment (same X)
    for (const other of otherLabels) {
      if (Math.abs(newX - other.x) < snapThreshold) {
        newX = other.x
        activeSnapGuides.x = other.x
        break
      }
    }

    // Also snap to center lines (50%)
    if (Math.abs(newX - 50) < snapThreshold) {
      newX = 50
      activeSnapGuides.x = 50
    }
    if (Math.abs(newY - 50) < snapThreshold) {
      newY = 50
      activeSnapGuides.y = 50
    }

    label.x = newX
    label.y = newY
  }
}

function stopDrag() {
  isDragging.value = false
  activeSnapGuides.x = null
  activeSnapGuides.y = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Start resizing a label
function startResize(e, label) {
  e.preventDefault()
  e.stopPropagation()
  selectedLabel.value = label.id
  isResizing.value = true
  dragStart.x = e.clientX
  labelStart.scale = label.scale

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e) {
  if (!isResizing.value) return

  const dx = e.clientX - dragStart.x
  const scaleDelta = dx / 100

  const label = labels.value.find(l => l.id === selectedLabel.value)
  if (label) {
    label.scale = Math.max(0.5, Math.min(4, labelStart.scale + scaleDelta))
  }
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Update label text
function updateLabelText(e, label) {
  label.text = e.target.innerText || 'LABEL'
}

// Finish editing label
function finishEditing() {
  editingLabel.value = null
}

// Start editing label on double click
function startEditing(label) {
  editingLabel.value = label.id
  selectedLabel.value = label.id
}

// Cycle alignment
function cycleAlign(label) {
  const aligns = ['left', 'center', 'right']
  const idx = aligns.indexOf(label.align)
  label.align = aligns[(idx + 1) % aligns.length]
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }
}

// Create p5 sketch
function createSketch() {
  return (p) => {
    const previewWidth = 600
    const previewHeight = 600

    p.setup = () => {
      const canvas = p.createCanvas(previewWidth, previewHeight)
      canvas.parent(canvasContainer.value)
      p.textFont(props.constraints.typeface)
      p.noLoop()
      drawVisual(p)
    }

    p.draw = () => {
      drawVisual(p)
    }

    function drawVisual(p) {
      const bg = hexToRgb(props.constraints.background)
      const fg = hexToRgb(props.constraints.foreground)

      p.background(bg.r, bg.g, bg.b)
      p.fill(fg.r, fg.g, fg.b)
      p.stroke(fg.r, fg.g, fg.b)

      drawAIVisual(p, fg, bg)
    }

    function drawAIVisual(p, fg, bg) {
      if (aiGeneratedCode.value) {
        try {
          const drawFunc = new Function('p', aiGeneratedCode.value)
          drawFunc(p)
        } catch (err) {
          console.error('AI code execution error:', err)
          drawPlaceholder(p, fg, 'ERROR RENDERING')
        }
      } else if (isGenerating.value) {
        drawPlaceholder(p, fg, 'GENERATING...')
      } else if (aiError.value) {
        drawPlaceholder(p, fg, aiError.value.toUpperCase())
      } else if (!props.apiKey) {
        drawPlaceholder(p, fg, 'ENTER API KEY')
      } else if (!props.prompt) {
        drawPlaceholder(p, fg, 'TYPE PROMPT + SPACE')
      } else {
        drawPlaceholder(p, fg, 'TYPE PROMPT + SPACE')
      }
    }

    function drawPlaceholder(p, fg, message) {
      p.noStroke()
      p.fill(fg.r, fg.g, fg.b, 100)
      p.textAlign(p.CENTER, p.CENTER)
      p.textSize(14)
      p.text(message, p.width / 2, p.height / 2)
    }
  }
}

// Generate AI visual from prompt
async function generateAIVisual() {
  if (!props.apiKey) {
    aiError.value = 'API key required'
    return
  }

  if (!props.prompt || props.prompt.trim() === '') {
    aiError.value = 'Enter a prompt'
    return
  }

  isGenerating.value = true
  aiError.value = ''

  if (p5Instance) {
    p5Instance.redraw()
  }

  try {
    const code = await generateP5Code(props.apiKey, props.prompt, {
      foreground: props.constraints.foreground,
      background: props.constraints.background
    })

    const historyItem = {
      code,
      prompt: props.prompt,
      timestamp: Date.now(),
      constraints: {
        foreground: props.constraints.foreground,
        background: props.constraints.background
      }
    }

    if (historyIndex.value < generationHistory.value.length - 1) {
      generationHistory.value = generationHistory.value.slice(0, historyIndex.value + 1)
    }

    generationHistory.value.push(historyItem)
    historyIndex.value = generationHistory.value.length - 1

    aiGeneratedCode.value = code
    aiError.value = ''
  } catch (err) {
    console.error('AI generation error:', err)
    aiError.value = err.message || 'Generation failed'
  } finally {
    isGenerating.value = false
    if (p5Instance) {
      p5Instance.redraw()
    }
  }
}

// Navigate history
function goBack() {
  if (canGoBack.value) {
    historyIndex.value--
    aiGeneratedCode.value = generationHistory.value[historyIndex.value].code
    if (p5Instance) {
      p5Instance.redraw()
    }
  }
}

function goForward() {
  if (canGoForward.value) {
    historyIndex.value++
    aiGeneratedCode.value = generationHistory.value[historyIndex.value].code
    if (p5Instance) {
      p5Instance.redraw()
    }
  }
}

function regenerate() {
  generateAIVisual()
}

// Get canvas for export
function getCanvas() {
  if (p5Instance) {
    return canvasContainer.value.querySelector('canvas')
  }
  return null
}

// Export canvas at specified size (with labels)
function exportCanvas(width, height) {
  return new Promise((resolve) => {
    const exportContainer = document.createElement('div')
    exportContainer.style.position = 'absolute'
    exportContainer.style.left = '-9999px'
    document.body.appendChild(exportContainer)

    const exportSketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(width, height)
        canvas.parent(exportContainer)
        p.textFont(props.constraints.typeface)
        p.noLoop()

        const bg = hexToRgb(props.constraints.background)
        const fg = hexToRgb(props.constraints.foreground)

        p.background(bg.r, bg.g, bg.b)
        p.fill(fg.r, fg.g, fg.b)
        p.stroke(fg.r, fg.g, fg.b)

        const scale = width / 600

        // Draw AI visual
        if (aiGeneratedCode.value) {
          try {
            p.push()
            p.scale(scale)
            const drawFunc = new Function('p', aiGeneratedCode.value)
            drawFunc(p)
            p.pop()
          } catch (err) {
            console.error('AI code execution error during export:', err)
          }
        }

        // Draw labels
        p.fill(fg.r, fg.g, fg.b)
        p.noStroke()
        labels.value.forEach(label => {
          const x = (label.x / 100) * width
          const y = (label.y / 100) * height
          const fontSize = 16 * label.scale * scale

          p.textSize(fontSize)
          p.textAlign(
            label.align === 'left' ? p.LEFT : label.align === 'right' ? p.RIGHT : p.CENTER,
            p.CENTER
          )
          p.text(label.text, x, y)
        })

        const dataUrl = canvas.elt.toDataURL('image/png')
        p.remove()
        document.body.removeChild(exportContainer)
        resolve(dataUrl)
      }
    }

    new p5(exportSketch)
  })
}

// Watch for constraint changes
watch(() => props.constraints, () => {
  if (p5Instance) {
    p5Instance.redraw()
  }
}, { deep: true })

// Watch for prompt changes - generate after spaces (word boundaries)
watch(() => props.prompt, (newVal, oldVal) => {
  // Generate when space is typed (end of word) and we have an API key
  if (newVal && newVal.endsWith(' ') && props.apiKey && !isGenerating.value) {
    generateAIVisual()
  }
  // Redraw when prompt is cleared (to update placeholder)
  if (!newVal && oldVal && p5Instance) {
    p5Instance.redraw()
  }
})

// Save current iteration
async function saveIteration() {
  if (isSaving.value) return

  isSaving.value = true

  try {
    // Generate thumbnail
    const thumbnail = await exportCanvas(200, 200)

    const iteration = {
      id: Date.now(),
      name: saveName.value || `Iteration ${Date.now()}`,
      code: aiGeneratedCode.value,
      labels: JSON.parse(JSON.stringify(labels.value)),
      prompt: props.prompt,
      constraints: {
        foreground: props.constraints.foreground,
        background: props.constraints.background
      },
      thumbnail,
      createdAt: new Date().toISOString()
    }

    emit('save', iteration)
    saveName.value = ''
  } catch (err) {
    console.error('Failed to save iteration:', err)
  } finally {
    isSaving.value = false
  }
}

// Load a saved iteration
function loadIteration(iteration) {
  aiGeneratedCode.value = iteration.code || ''
  labels.value = iteration.labels ? JSON.parse(JSON.stringify(iteration.labels)) : []
  selectedLabel.value = null
  editingLabel.value = null

  if (p5Instance) {
    p5Instance.redraw()
  }
}

onMounted(() => {
  p5Instance = new p5(createSketch())
  emit('canvas-ready', { getCanvas, exportCanvas })
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})

defineExpose({
  regenerate,
  getCanvas,
  exportCanvas,
  loadIteration
})
</script>

<template>
  <div class="canvas-preview" @click="selectedLabel = null">
    <!-- Canvas Container with Labels Overlay -->
    <div ref="canvasWrapper" class="canvas-wrapper">
      <div ref="canvasContainer" class="canvas-container"></div>

      <!-- Labels Overlay -->
      <div class="labels-overlay">
        <!-- Snap guides -->
        <div
          v-if="activeSnapGuides.x !== null"
          class="snap-guide snap-guide-vertical"
          :style="{ left: activeSnapGuides.x + '%' }"
        ></div>
        <div
          v-if="activeSnapGuides.y !== null"
          class="snap-guide snap-guide-horizontal"
          :style="{ top: activeSnapGuides.y + '%' }"
        ></div>

        <div
          v-for="label in labels"
          :key="label.id"
          class="label"
          :class="{ selected: selectedLabel === label.id, editing: editingLabel === label.id }"
          :style="{
            left: label.x + '%',
            top: label.y + '%',
            transform: `translate(-50%, -50%) scale(${label.scale})`,
            textAlign: label.align,
            color: constraints.foreground
          }"
          @mousedown="startDrag($event, label)"
          @dblclick="startEditing(label)"
          @click.stop="selectedLabel = label.id"
        >
          <span
            :contenteditable="editingLabel === label.id"
            @blur="finishEditing"
            @input="updateLabelText($event, label)"
            @keydown.enter.prevent="finishEditing"
            class="label-text"
          >{{ label.text }}</span>

          <!-- Resize handle -->
          <div
            v-if="selectedLabel === label.id && editingLabel !== label.id"
            class="resize-handle"
            @mousedown="startResize($event, label)"
          >⤡</div>

          <!-- Delete button -->
          <button
            v-if="selectedLabel === label.id && editingLabel !== label.id"
            class="delete-btn"
            @click.stop="deleteLabel(label.id)"
          >×</button>

          <!-- Align button -->
          <button
            v-if="selectedLabel === label.id && editingLabel !== label.id"
            class="align-btn"
            @click.stop="cycleAlign(label)"
          >{{ label.align === 'left' ? '←' : label.align === 'right' ? '→' : '↔' }}</button>
        </div>
      </div>
    </div>

    <!-- Controls Row -->
    <div class="controls">
      <button
        class="btn"
        @click.stop="regenerate"
        :disabled="isGenerating || !apiKey"
      >
        {{ isGenerating ? 'GENERATING...' : '✦ GENERATE' }}
      </button>

      <button class="btn" @click.stop="addLabel">
        + LABEL
      </button>

      <!-- History Navigation -->
      <div v-if="generationHistory.length > 0" class="history-nav">
        <button class="nav-btn" :disabled="!canGoBack" @click.stop="goBack">←</button>
        <span class="history-pos">{{ historyIndex + 1 }}/{{ generationHistory.length }}</span>
        <button class="nav-btn" :disabled="!canGoForward" @click.stop="goForward">→</button>
      </div>
    </div>

    <!-- Save Row -->
    <div class="save-row">
      <input
        type="text"
        v-model="saveName"
        placeholder="NAME THIS ITERATION..."
        class="save-name"
        @click.stop
        @keydown.enter="saveIteration"
      />
      <button
        class="btn"
        @click.stop="saveIteration"
        :disabled="isSaving || !aiGeneratedCode"
      >
        {{ isSaving ? 'SAVING...' : '↓ SAVE' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.canvas-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  flex: 1;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  position: relative;
}

.canvas-container {
  position: relative;
  border: 1px solid var(--color-border);
}

.canvas-container :deep(canvas) {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.labels-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.label {
  position: absolute;
  pointer-events: auto;
  cursor: move;
  user-select: none;
  font-size: 16px;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.snap-guide {
  position: absolute;
  pointer-events: none;
  background: var(--color-accent);
}

.snap-guide-vertical {
  width: 1px;
  top: 0;
  bottom: 0;
}

.snap-guide-horizontal {
  height: 1px;
  left: 0;
  right: 0;
}

.label.selected {
  outline: 1px dashed var(--color-fg);
  outline-offset: 4px;
}

.label.editing {
  cursor: text;
}

.label-text {
  display: inline-block;
  min-width: 20px;
  outline: none;
}

.label.editing .label-text {
  background: rgba(0,0,0,0.5);
  padding: 2px 4px;
}

.resize-handle {
  position: absolute;
  right: -20px;
  bottom: -20px;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  font-size: 10px;
  opacity: 0.5;
}

.resize-handle:hover {
  opacity: 1;
}

.delete-btn, .align-btn {
  position: absolute;
  top: -20px;
  width: 16px;
  height: 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-fg);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  font-family: var(--font-mono);
}

.delete-btn {
  right: -20px;
}

.delete-btn:hover {
  background: #f00;
  border-color: #f00;
}

.align-btn {
  left: -20px;
}

.align-btn:hover {
  border-color: var(--color-fg);
}

.controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-lg);
  margin-left: calc(-1 * var(--space-lg));
  margin-right: calc(-1 * var(--space-lg));
  padding-left: var(--space-lg);
  padding-right: var(--space-lg);
}

.history-nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-left: auto;
}

.nav-btn {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-fg);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-mono);
}

.nav-btn:hover:not(:disabled) {
  border-color: var(--color-fg);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.history-pos {
  font-size: 12px;
  color: var(--color-accent);
  min-width: 40px;
  text-align: center;
}

.save-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-lg);
  margin-left: calc(-1 * var(--space-lg));
  margin-right: calc(-1 * var(--space-lg));
  padding-left: var(--space-lg);
  padding-right: var(--space-lg);
}

.save-name {
  flex: 1;
}
</style>
