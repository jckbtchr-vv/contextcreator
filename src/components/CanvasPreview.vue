<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import p5 from 'p5'
import { generateP5Code } from '../services/geminiService'

const props = defineProps({
  constraints: Object,
  prompt: String,
  exportSize: Object,
  apiKey: String
})

const emit = defineEmits(['canvas-ready'])

const canvasContainer = ref(null)
const isGenerating = ref(false)
const currentVisual = ref('ai') // 'text', 'ai', 'grid', 'wave'
const aiGeneratedCode = ref('')
const aiError = ref('')

let p5Instance = null

// Visual generation modes
const visualModes = [
  { id: 'ai', name: 'AI Generated', icon: '✦' },
  { id: 'text', name: 'Text', icon: 'T' },
  { id: 'grid', name: 'Grid', icon: '▦' },
  { id: 'wave', name: 'Wave', icon: '∿' },
  { id: 'circles', name: 'Circles', icon: '◎' },
  { id: 'lines', name: 'Lines', icon: '≡' }
]

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

      switch (currentVisual.value) {
        case 'text':
          drawTextVisual(p, fg)
          break
        case 'ai':
          drawAIVisual(p, fg, bg)
          break
        case 'grid':
          drawGridVisual(p, fg)
          break
        case 'wave':
          drawWaveVisual(p, fg)
          break
        case 'circles':
          drawCirclesVisual(p, fg)
          break
        case 'lines':
          drawLinesVisual(p, fg)
          break
      }
    }

    function drawTextVisual(p, fg) {
      p.noStroke()
      p.textAlign(p.CENTER, p.CENTER)

      const text = props.prompt || 'Your text here'
      const lines = text.split('\n')
      const maxWidth = p.width * 0.8

      // Calculate font size to fit
      let fontSize = 72
      p.textSize(fontSize)

      // Find appropriate font size
      for (let line of lines) {
        while (p.textWidth(line) > maxWidth && fontSize > 12) {
          fontSize -= 2
          p.textSize(fontSize)
        }
      }

      const lineHeight = fontSize * 1.3
      const totalHeight = lines.length * lineHeight
      const startY = (p.height - totalHeight) / 2 + lineHeight / 2

      lines.forEach((line, i) => {
        p.text(line, p.width / 2, startY + i * lineHeight)
      })
    }

    function drawAIVisual(p, fg, bg) {
      // If we have AI-generated code, execute it
      if (aiGeneratedCode.value) {
        try {
          // Create a safe execution context
          const drawFunc = new Function('p', aiGeneratedCode.value)
          drawFunc(p)
        } catch (err) {
          // If execution fails, show error state
          console.error('AI code execution error:', err)
          drawPlaceholder(p, fg, 'Error rendering AI visual')
        }
      } else if (isGenerating.value) {
        // Show loading state
        drawPlaceholder(p, fg, 'Generating...')
      } else if (aiError.value) {
        // Show error message
        drawPlaceholder(p, fg, aiError.value)
      } else if (!props.apiKey) {
        // No API key
        drawPlaceholder(p, fg, 'Enter API key to generate')
      } else if (!props.prompt) {
        // No prompt
        drawPlaceholder(p, fg, 'Enter a prompt to generate')
      } else {
        // Ready to generate
        drawPlaceholder(p, fg, 'Click Generate to create visual')
      }
    }

    function drawPlaceholder(p, fg, message) {
      p.noStroke()
      p.fill(fg.r, fg.g, fg.b, 100)
      p.textAlign(p.CENTER, p.CENTER)
      p.textSize(18)
      p.text(message, p.width / 2, p.height / 2)
    }

    function drawGridVisual(p, fg) {
      const cols = 8
      const rows = 8
      const cellWidth = p.width / cols
      const cellHeight = p.height / rows
      const padding = 8

      p.noFill()
      p.strokeWeight(1)

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * cellWidth + padding
          const y = j * cellHeight + padding
          const w = cellWidth - padding * 2
          const h = cellHeight - padding * 2

          // Vary the visual based on position
          const variant = (i + j) % 4

          if (variant === 0) {
            p.rect(x, y, w, h)
          } else if (variant === 1) {
            p.ellipse(x + w/2, y + h/2, w * 0.8, h * 0.8)
          } else if (variant === 2) {
            p.line(x, y, x + w, y + h)
            p.line(x + w, y, x, y + h)
          } else {
            p.line(x, y + h/2, x + w, y + h/2)
            p.line(x + w/2, y, x + w/2, y + h)
          }
        }
      }
    }

    function drawWaveVisual(p, fg) {
      p.noFill()
      p.strokeWeight(2)

      const waves = 12
      const amplitude = 30
      const frequency = 0.02

      for (let w = 0; w < waves; w++) {
        const yOffset = (p.height / (waves + 1)) * (w + 1)
        const phase = w * 0.5

        p.beginShape()
        for (let x = 0; x <= p.width; x += 5) {
          const y = yOffset + Math.sin((x * frequency) + phase) * amplitude
          p.vertex(x, y)
        }
        p.endShape()
      }

      // Add prompt text if available
      if (props.prompt) {
        p.fill(fg.r, fg.g, fg.b)
        p.noStroke()
        p.textAlign(p.CENTER, p.CENTER)
        p.textSize(32)
        p.text(props.prompt, p.width / 2, p.height / 2)
      }
    }

    function drawCirclesVisual(p, fg) {
      p.noFill()
      p.strokeWeight(1)

      const centerX = p.width / 2
      const centerY = p.height / 2
      const maxRadius = Math.min(p.width, p.height) * 0.45

      // Concentric circles
      for (let i = 1; i <= 15; i++) {
        const radius = (maxRadius / 15) * i
        p.ellipse(centerX, centerY, radius * 2, radius * 2)
      }

      // Center dot
      p.fill(fg.r, fg.g, fg.b)
      p.noStroke()
      p.ellipse(centerX, centerY, 10, 10)

      // Add prompt text if available
      if (props.prompt) {
        p.textAlign(p.CENTER, p.BOTTOM)
        p.textSize(24)
        p.text(props.prompt, centerX, p.height - 40)
      }
    }

    function drawLinesVisual(p, fg) {
      p.strokeWeight(1)

      const lines = 30
      const margin = 60

      for (let i = 0; i < lines; i++) {
        const x = margin + ((p.width - margin * 2) / (lines - 1)) * i
        const variation = Math.sin(i * 0.3) * 50

        p.line(x, margin + variation, x, p.height - margin - variation)
      }

      // Add prompt text if available
      if (props.prompt) {
        p.fill(fg.r, fg.g, fg.b)
        p.noStroke()
        p.textAlign(p.CENTER, p.CENTER)
        p.textSize(28)

        // Draw text with background for readability
        const bg = hexToRgb(props.constraints.background)
        p.fill(bg.r, bg.g, bg.b)
        p.rectMode(p.CENTER)
        const tw = p.textWidth(props.prompt) + 40
        p.rect(p.width / 2, p.height / 2, tw, 50)

        p.fill(fg.r, fg.g, fg.b)
        p.text(props.prompt, p.width / 2, p.height / 2)
      }
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

  // Redraw to show loading state
  if (p5Instance) {
    p5Instance.redraw()
  }

  try {
    const code = await generateP5Code(props.apiKey, props.prompt, {
      foreground: props.constraints.foreground,
      background: props.constraints.background
    })
    aiGeneratedCode.value = code
    aiError.value = ''
  } catch (err) {
    console.error('AI generation error:', err)
    aiError.value = err.message || 'Generation failed'
    aiGeneratedCode.value = ''
  } finally {
    isGenerating.value = false
    if (p5Instance) {
      p5Instance.redraw()
    }
  }
}

function regenerate() {
  if (currentVisual.value === 'ai') {
    generateAIVisual()
  } else if (p5Instance) {
    p5Instance.redraw()
  }
}

function setVisualMode(mode) {
  currentVisual.value = mode
  regenerate()
}

// Get canvas for export
function getCanvas() {
  if (p5Instance) {
    return canvasContainer.value.querySelector('canvas')
  }
  return null
}

// Export canvas at specified size
function exportCanvas(width, height) {
  return new Promise((resolve) => {
    // Create a new p5 instance at export size
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

        // Draw at export size
        const bg = hexToRgb(props.constraints.background)
        const fg = hexToRgb(props.constraints.foreground)

        p.background(bg.r, bg.g, bg.b)
        p.fill(fg.r, fg.g, fg.b)
        p.stroke(fg.r, fg.g, fg.b)

        // Scale factor
        const scale = width / 600

        // Draw the current visual mode scaled
        drawScaledVisual(p, fg, scale)

        // Get data URL
        const dataUrl = canvas.elt.toDataURL('image/png')

        // Cleanup
        p.remove()
        document.body.removeChild(exportContainer)

        resolve(dataUrl)
      }

      function drawScaledVisual(p, fg, scale) {
        switch (currentVisual.value) {
          case 'text':
            drawScaledText(p, fg, scale)
            break
          case 'ai':
            drawScaledAI(p, fg, scale)
            break
          case 'grid':
            drawScaledGrid(p, fg, scale)
            break
          case 'wave':
            drawScaledWave(p, fg, scale)
            break
          case 'circles':
            drawScaledCircles(p, fg, scale)
            break
          case 'lines':
            drawScaledLines(p, fg, scale)
            break
        }
      }

      function drawScaledText(p, fg, scale) {
        p.noStroke()
        p.textAlign(p.CENTER, p.CENTER)

        const text = props.prompt || 'Your text here'
        const lines = text.split('\n')
        const maxWidth = p.width * 0.8

        let fontSize = 72 * scale
        p.textSize(fontSize)

        for (let line of lines) {
          while (p.textWidth(line) > maxWidth && fontSize > 12 * scale) {
            fontSize -= 2 * scale
            p.textSize(fontSize)
          }
        }

        const lineHeight = fontSize * 1.3
        const totalHeight = lines.length * lineHeight
        const startY = (p.height - totalHeight) / 2 + lineHeight / 2

        lines.forEach((line, i) => {
          p.text(line, p.width / 2, startY + i * lineHeight)
        })
      }

      function drawScaledAI(p, fg, scale) {
        // For AI-generated visuals, we need to apply scaling
        // The generated code uses 600x600 dimensions, so we scale the canvas
        if (aiGeneratedCode.value) {
          try {
            p.push()
            p.scale(scale)
            const drawFunc = new Function('p', aiGeneratedCode.value)
            drawFunc(p)
            p.pop()
          } catch (err) {
            console.error('AI code execution error during export:', err)
            p.noStroke()
            p.fill(fg.r, fg.g, fg.b, 100)
            p.textAlign(p.CENTER, p.CENTER)
            p.textSize(18 * scale)
            p.text('Error rendering AI visual', p.width / 2, p.height / 2)
          }
        } else {
          p.noStroke()
          p.fill(fg.r, fg.g, fg.b, 100)
          p.textAlign(p.CENTER, p.CENTER)
          p.textSize(18 * scale)
          p.text('No AI visual generated', p.width / 2, p.height / 2)
        }
      }

      function drawScaledGrid(p, fg, scale) {
        const cols = 8
        const rows = 8
        const cellWidth = p.width / cols
        const cellHeight = p.height / rows
        const padding = 8 * scale

        p.noFill()
        p.strokeWeight(1 * scale)

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = i * cellWidth + padding
            const y = j * cellHeight + padding
            const w = cellWidth - padding * 2
            const h = cellHeight - padding * 2
            const variant = (i + j) % 4

            if (variant === 0) {
              p.rect(x, y, w, h)
            } else if (variant === 1) {
              p.ellipse(x + w/2, y + h/2, w * 0.8, h * 0.8)
            } else if (variant === 2) {
              p.line(x, y, x + w, y + h)
              p.line(x + w, y, x, y + h)
            } else {
              p.line(x, y + h/2, x + w, y + h/2)
              p.line(x + w/2, y, x + w/2, y + h)
            }
          }
        }
      }

      function drawScaledWave(p, fg, scale) {
        p.noFill()
        p.strokeWeight(2 * scale)

        const waves = 12
        const amplitude = 30 * scale
        const frequency = 0.02 / scale

        for (let w = 0; w < waves; w++) {
          const yOffset = (p.height / (waves + 1)) * (w + 1)
          const phase = w * 0.5

          p.beginShape()
          for (let x = 0; x <= p.width; x += 5 * scale) {
            const y = yOffset + Math.sin((x * frequency) + phase) * amplitude
            p.vertex(x, y)
          }
          p.endShape()
        }

        if (props.prompt) {
          p.fill(fg.r, fg.g, fg.b)
          p.noStroke()
          p.textAlign(p.CENTER, p.CENTER)
          p.textSize(32 * scale)
          p.text(props.prompt, p.width / 2, p.height / 2)
        }
      }

      function drawScaledCircles(p, fg, scale) {
        p.noFill()
        p.strokeWeight(1 * scale)

        const centerX = p.width / 2
        const centerY = p.height / 2
        const maxRadius = Math.min(p.width, p.height) * 0.45

        for (let i = 1; i <= 15; i++) {
          const radius = (maxRadius / 15) * i
          p.ellipse(centerX, centerY, radius * 2, radius * 2)
        }

        p.fill(fg.r, fg.g, fg.b)
        p.noStroke()
        p.ellipse(centerX, centerY, 10 * scale, 10 * scale)

        if (props.prompt) {
          p.textAlign(p.CENTER, p.BOTTOM)
          p.textSize(24 * scale)
          p.text(props.prompt, centerX, p.height - 40 * scale)
        }
      }

      function drawScaledLines(p, fg, scale) {
        p.strokeWeight(1 * scale)

        const lines = 30
        const margin = 60 * scale

        for (let i = 0; i < lines; i++) {
          const x = margin + ((p.width - margin * 2) / (lines - 1)) * i
          const variation = Math.sin(i * 0.3) * 50 * scale
          p.line(x, margin + variation, x, p.height - margin - variation)
        }

        if (props.prompt) {
          const bg = hexToRgb(props.constraints.background)
          p.fill(bg.r, bg.g, bg.b)
          p.noStroke()
          p.rectMode(p.CENTER)
          p.textSize(28 * scale)
          const tw = p.textWidth(props.prompt) + 40 * scale
          p.rect(p.width / 2, p.height / 2, tw, 50 * scale)

          p.fill(fg.r, fg.g, fg.b)
          p.textAlign(p.CENTER, p.CENTER)
          p.text(props.prompt, p.width / 2, p.height / 2)
        }
      }
    }

    new p5(exportSketch)
  })
}

// Watch for changes and redraw
watch(() => props.constraints, () => {
  regenerate()
}, { deep: true })

watch(() => props.prompt, () => {
  regenerate()
})

onMounted(() => {
  p5Instance = new p5(createSketch())
  emit('canvas-ready', { getCanvas, exportCanvas })
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})

// Expose methods for parent
defineExpose({
  regenerate,
  getCanvas,
  exportCanvas
})
</script>

<template>
  <div class="canvas-preview">
    <!-- Visual Mode Selector -->
    <div class="mode-selector">
      <button
        v-for="mode in visualModes"
        :key="mode.id"
        class="mode-btn"
        :class="{ active: currentVisual === mode.id }"
        @click="setVisualMode(mode.id)"
        :title="mode.name"
      >
        <span class="mode-icon">{{ mode.icon }}</span>
        <span class="mode-name">{{ mode.name }}</span>
      </button>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-wrapper">
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>

    <!-- Generate/Regenerate Button -->
    <button
      class="btn regenerate-btn"
      :class="{ generating: isGenerating }"
      @click="regenerate"
      :disabled="isGenerating || (currentVisual === 'ai' && !apiKey)"
    >
      <svg v-if="!isGenerating" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="currentVisual === 'ai'" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        <template v-else>
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </template>
      </svg>
      <svg v-else class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
      {{ isGenerating ? 'Generating...' : (currentVisual === 'ai' ? 'Generate' : 'Regenerate') }}
    </button>

    <!-- Show generated code info for AI mode -->
    <div v-if="currentVisual === 'ai' && aiGeneratedCode" class="code-info">
      <span class="code-status">✓ AI visual generated</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.mode-selector {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  padding: var(--space-sm);
  background: var(--color-muted);
  border-radius: var(--radius-md);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  color: var(--color-fg);
}

.mode-btn.active {
  background: var(--color-bg);
  border-color: var(--color-border);
  color: var(--color-fg);
}

.mode-icon {
  font-size: 1rem;
  line-height: 1;
}

.mode-name {
  font-weight: 500;
}

.canvas-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  min-height: 400px;
}

.canvas-container {
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

.canvas-container :deep(canvas) {
  display: block;
  max-width: 100%;
  height: auto;
}

.regenerate-btn {
  align-self: flex-start;
}

.regenerate-btn.generating {
  opacity: 0.7;
  cursor: wait;
}

.regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.code-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.75rem;
  color: var(--color-accent);
}

.code-status {
  color: #00ff88;
}
</style>
