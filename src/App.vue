<script setup>
import { ref, reactive, computed, watch } from 'vue'
import ConstraintPanel from './components/ConstraintPanel.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import ExportPanel from './components/ExportPanel.vue'
import ApiSettingsPanel from './components/ApiSettingsPanel.vue'

// Constraints state
const constraints = reactive({
  foreground: '#ffffff',
  background: '#000000',
  typeface: 'Departure Mono'
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
  { name: 'Departure Mono', family: 'Departure Mono' }
]

// Custom uploaded fonts
const customFonts = ref([])

// Handle font upload
function handleFontUpload(font) {
  customFonts.value.push(font)
}

// Export sizes for different platforms
const exportSizes = [
  { name: '1080x1080', width: 1080, height: 1080 },
  { name: '1080x1920', width: 1080, height: 1920 },
  { name: '1200x675', width: 1200, height: 675 },
  { name: '1200x630', width: 1200, height: 630 }
]

const selectedExportSize = ref(exportSizes[0])
</script>

<template>
  <div class="app">
    <div class="layout">
      <!-- Left Panel -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo">CONTEXT CREATOR</span>
        </div>

        <ApiSettingsPanel v-model="apiKey" />

        <div class="divider"></div>

        <ConstraintPanel
          v-model:foreground="constraints.foreground"
          v-model:background="constraints.background"
          v-model:typeface="constraints.typeface"
          :typefaces="typefaces"
          :custom-fonts="customFonts"
          @upload-font="handleFontUpload"
        />

        <div class="divider"></div>

        <ExportPanel
          :canvas-ref="canvasRef"
          :sizes="exportSizes"
          v-model:selected-size="selectedExportSize"
          :constraints="constraints"
        />
      </aside>

      <!-- Main Content -->
      <main class="main">
        <CanvasPreview
          ref="canvasRef"
          :constraints="constraints"
          :prompt="prompt"
          :export-size="selectedExportSize"
          :api-key="apiKey"
        />

        <div class="prompt-section">
          <label for="prompt">PROMPT</label>
          <textarea
            id="prompt"
            v-model="prompt"
            placeholder="Describe the visual..."
            rows="2"
          ></textarea>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--color-bg);
}

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid var(--color-border);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  overflow-y: auto;
}

.sidebar-header {
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--color-fg);
}

.divider {
  height: 1px;
  background: var(--color-border);
}

.main {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.prompt-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-md);
}

.prompt-section textarea {
  resize: none;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
