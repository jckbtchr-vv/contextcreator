<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import ConstraintPanel from './components/ConstraintPanel.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import ExportPanel from './components/ExportPanel.vue'
import ApiSettingsPanel from './components/ApiSettingsPanel.vue'

// Constraints state
const constraints = reactive({
  foreground: '#ffffff',
  background: '#000000',
  typeface: 'Inter'
})

// API key for Gemini
const apiKey = ref(localStorage.getItem('gemini_api_key') || '')

// Save API key to localStorage when it changes
watch(apiKey, (newKey) => {
  if (newKey) {
    localStorage.setItem('gemini_api_key', newKey)
  } else {
    localStorage.removeItem('gemini_api_key')
  }
})

// Prompt for visual generation
const prompt = ref('')

// Canvas reference for export
const canvasRef = ref(null)

// Available typefaces
const typefaces = [
  { name: 'Inter', family: 'Inter' },
  { name: 'Space Grotesk', family: 'Space Grotesk' },
  { name: 'JetBrains Mono', family: 'JetBrains Mono' }
]

// Custom uploaded fonts
const customFonts = ref([])

// Handle font upload
function handleFontUpload(font) {
  customFonts.value.push(font)
}

// Export sizes for different platforms
const exportSizes = [
  { name: 'Instagram Square', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Twitter Post', width: 1200, height: 675 },
  { name: 'LinkedIn', width: 1200, height: 627 },
  { name: 'Open Graph', width: 1200, height: 630 }
]

const selectedExportSize = ref(exportSizes[0])

// Computed style object for preview
const previewStyle = computed(() => ({
  '--preview-fg': constraints.foreground,
  '--preview-bg': constraints.background,
  '--preview-font': constraints.typeface
}))
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1 class="logo">Context Creator</h1>
          <p class="tagline">Constraint-based visual generation</p>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div class="workspace">
          <!-- Left Panel: Settings -->
          <aside class="sidebar">
            <ApiSettingsPanel v-model="apiKey" />

            <ConstraintPanel
              v-model:foreground="constraints.foreground"
              v-model:background="constraints.background"
              v-model:typeface="constraints.typeface"
              :typefaces="typefaces"
              :custom-fonts="customFonts"
              @upload-font="handleFontUpload"
            />

            <ExportPanel
              :canvas-ref="canvasRef"
              :sizes="exportSizes"
              v-model:selected-size="selectedExportSize"
              :constraints="constraints"
            />
          </aside>

          <!-- Center: Canvas Preview -->
          <section class="canvas-area">
            <CanvasPreview
              ref="canvasRef"
              :constraints="constraints"
              :prompt="prompt"
              :export-size="selectedExportSize"
              :api-key="apiKey"
            />

            <!-- Prompt Input -->
            <div class="prompt-section">
              <label for="prompt">Visual Prompt</label>
              <textarea
                id="prompt"
                v-model="prompt"
                placeholder="Describe the visual you want to generate..."
                rows="3"
              ></textarea>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-lg) 0;
}

.header-content {
  display: flex;
  align-items: baseline;
  gap: var(--space-lg);
}

.logo {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.main {
  flex: 1;
  padding: var(--space-xl) 0;
}

.workspace {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-xl);
  min-height: calc(100vh - 200px);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.canvas-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.prompt-section {
  margin-top: var(--space-md);
}

.prompt-section textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }

  .canvas-area {
    order: 1;
  }
}
</style>
