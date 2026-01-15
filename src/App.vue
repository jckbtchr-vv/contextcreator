<script setup>
import { ref, reactive, watch } from 'vue'
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

// Saved iterations
const savedIterations = ref([])

// Load saved iterations from localStorage on mount
const storedIterations = localStorage.getItem('saved_iterations')
if (storedIterations) {
  try {
    savedIterations.value = JSON.parse(storedIterations)
  } catch (e) {
    console.error('Failed to load saved iterations:', e)
  }
}

// Save iterations to localStorage when changed
watch(savedIterations, (newVal) => {
  localStorage.setItem('saved_iterations', JSON.stringify(newVal))
}, { deep: true })

// Handle save from canvas
function handleSave(iteration) {
  savedIterations.value.unshift(iteration)
}

// Load a saved iteration
function loadIteration(iteration) {
  if (canvasRef.value) {
    canvasRef.value.loadIteration(iteration)
  }
  prompt.value = iteration.prompt || ''
  if (iteration.constraints) {
    constraints.foreground = iteration.constraints.foreground
    constraints.background = iteration.constraints.background
  }
}

// Delete a saved iteration
function deleteIteration(id) {
  savedIterations.value = savedIterations.value.filter(i => i.id !== id)
}
</script>

<template>
  <div class="app">
    <div class="layout">
      <!-- Left Panel -->
      <aside class="sidebar left">
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
          @save="handleSave"
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

      <!-- Right Panel - Saved Iterations -->
      <aside class="sidebar right">
        <div class="sidebar-header">
          <span class="section-title">SAVED</span>
          <span class="count">{{ savedIterations.length }}</span>
        </div>

        <div class="iterations-list">
          <div
            v-for="iteration in savedIterations"
            :key="iteration.id"
            class="iteration-card"
            @click="loadIteration(iteration)"
          >
            <div class="iteration-preview" :style="{ background: iteration.constraints?.background || '#000' }">
              <img v-if="iteration.thumbnail" :src="iteration.thumbnail" alt="" />
            </div>
            <div class="iteration-info">
              <div class="iteration-name">{{ iteration.name || 'Untitled' }}</div>
              <div class="iteration-prompt">{{ iteration.prompt?.slice(0, 40) }}{{ iteration.prompt?.length > 40 ? '...' : '' }}</div>
            </div>
            <button class="delete-iteration" @click.stop="deleteIteration(iteration.id)">×</button>
          </div>

          <div v-if="savedIterations.length === 0" class="empty-state">
            No saved iterations yet
          </div>
        </div>
      </aside>
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
  grid-template-columns: 240px 1fr 200px;
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

.sidebar.right {
  border-right: none;
  border-left: 1px solid var(--color-border);
}

.sidebar-header {
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--color-fg);
}

.section-title {
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.count {
  font-size: 12px;
  color: var(--color-accent);
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

/* Iterations List */
.iterations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex: 1;
  overflow-y: auto;
}

.iteration-card {
  border: 1px solid var(--color-border);
  cursor: pointer;
  position: relative;
}

.iteration-card:hover {
  border-color: var(--color-fg);
}

.iteration-preview {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.iteration-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.iteration-info {
  padding: var(--space-xs);
  border-top: 1px solid var(--color-border);
}

.iteration-name {
  font-size: 12px;
  color: var(--color-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.iteration-prompt {
  font-size: 10px;
  color: var(--color-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.delete-iteration {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-fg);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.1s;
}

.iteration-card:hover .delete-iteration {
  opacity: 1;
}

.delete-iteration:hover {
  background: #f00;
  border-color: #f00;
}

.empty-state {
  font-size: 12px;
  color: var(--color-accent);
  text-align: center;
  padding: var(--space-lg) var(--space-sm);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar.right {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
