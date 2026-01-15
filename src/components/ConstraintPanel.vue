<script setup>
import { ref } from 'vue'

const props = defineProps({
  foreground: String,
  background: String,
  typeface: String,
  typefaces: Array,
  customFonts: Array
})

const emit = defineEmits([
  'update:foreground',
  'update:background',
  'update:typeface',
  'upload-font'
])

const fontFileInput = ref(null)
const isLoadingFont = ref(false)
const fontError = ref('')

function swapColors() {
  const temp = props.foreground
  emit('update:foreground', props.background)
  emit('update:background', temp)
}

function triggerFontUpload() {
  fontFileInput.value?.click()
}

async function handleFontUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  const validTypes = ['.ttf', '.otf', '.woff', '.woff2']
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  if (!validTypes.includes(extension)) {
    fontError.value = 'Invalid file type. Use TTF, OTF, WOFF, or WOFF2'
    return
  }

  isLoadingFont.value = true
  fontError.value = ''

  try {
    // Read the file as ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Generate a font family name from the filename
    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-')
    const fontFamily = `custom-${fontName}-${Date.now()}`

    // Create and load the font
    const fontFace = new FontFace(fontFamily, buffer)
    await fontFace.load()

    // Add to document fonts
    document.fonts.add(fontFace)

    // Emit event to parent with font info
    emit('upload-font', {
      name: file.name.replace(/\.[^/.]+$/, ''),
      family: fontFamily
    })

    // Auto-select the newly uploaded font
    emit('update:typeface', fontFamily)

  } catch (err) {
    console.error('Font loading error:', err)
    fontError.value = 'Failed to load font'
  } finally {
    isLoadingFont.value = false
    // Reset input so same file can be selected again
    event.target.value = ''
  }
}

// Combined list of all fonts (built-in + custom)
const allFonts = () => {
  return [...(props.typefaces || []), ...(props.customFonts || [])]
}
</script>

<template>
  <div class="constraint-panel card">
    <h3 class="panel-title">Constraints</h3>

    <!-- Foreground Color -->
    <div class="section">
      <label for="fg-color">Foreground</label>
      <div class="color-input">
        <input
          type="color"
          id="fg-color"
          :value="foreground"
          @input="emit('update:foreground', $event.target.value)"
        />
        <input
          type="text"
          :value="foreground"
          @input="emit('update:foreground', $event.target.value)"
          class="color-text text-mono"
          maxlength="7"
        />
      </div>
    </div>

    <!-- Swap Button -->
    <button class="swap-btn" @click="swapColors" title="Swap colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
      </svg>
    </button>

    <!-- Background Color -->
    <div class="section">
      <label for="bg-color">Background</label>
      <div class="color-input">
        <input
          type="color"
          id="bg-color"
          :value="background"
          @input="emit('update:background', $event.target.value)"
        />
        <input
          type="text"
          :value="background"
          @input="emit('update:background', $event.target.value)"
          class="color-text text-mono"
          maxlength="7"
        />
      </div>
    </div>

    <!-- Typeface -->
    <div class="section">
      <label for="typeface">Typeface</label>
      <select
        id="typeface"
        :value="typeface"
        @change="emit('update:typeface', $event.target.value)"
      >
        <optgroup label="Built-in">
          <option
            v-for="tf in typefaces"
            :key="tf.family"
            :value="tf.family"
            :style="{ fontFamily: tf.family }"
          >
            {{ tf.name }}
          </option>
        </optgroup>
        <optgroup v-if="customFonts?.length" label="Custom">
          <option
            v-for="tf in customFonts"
            :key="tf.family"
            :value="tf.family"
            :style="{ fontFamily: tf.family }"
          >
            {{ tf.name }}
          </option>
        </optgroup>
      </select>

      <!-- Font Preview -->
      <div
        class="font-preview"
        :style="{ fontFamily: typeface }"
      >
        Aa Bb Cc 123
      </div>

      <!-- Upload Custom Font -->
      <input
        ref="fontFileInput"
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        @change="handleFontUpload"
        style="display: none"
      />
      <button
        class="upload-font-btn"
        @click="triggerFontUpload"
        :disabled="isLoadingFont"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        {{ isLoadingFont ? 'Loading...' : 'Upload Font' }}
      </button>
      <p v-if="fontError" class="font-error">{{ fontError }}</p>
      <p class="font-hint">TTF, OTF, WOFF, WOFF2</p>
    </div>
  </div>
</template>

<style scoped>
.constraint-panel {
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

/* Color Input */
.color-input {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.color-input input[type="color"] {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: transparent;
}

.color-input input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-input input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.color-text {
  flex: 1;
  text-transform: uppercase;
  font-size: 0.875rem;
}

/* Swap Button */
.swap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-xs);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  margin: var(--space-sm) 0;
  transition: all var(--transition-fast);
}

.swap-btn:hover {
  border-style: solid;
  color: var(--color-fg);
}

/* Select */
select {
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

/* Font Preview */
.font-preview {
  margin-top: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-muted);
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  text-align: center;
  letter-spacing: 0.05em;
}

/* Upload Font Button */
.upload-font-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  width: 100%;
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-fg);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-font-btn:hover:not(:disabled) {
  background: var(--color-border);
}

.upload-font-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.font-hint {
  margin-top: var(--space-xs);
  font-size: 0.625rem;
  color: var(--color-accent);
  text-align: center;
}

.font-error {
  margin-top: var(--space-xs);
  font-size: 0.75rem;
  color: #ff4444;
  text-align: center;
}
</style>
