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

  const validTypes = ['.ttf', '.otf', '.woff', '.woff2']
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  if (!validTypes.includes(extension)) {
    fontError.value = 'Use TTF, OTF, WOFF, or WOFF2'
    return
  }

  isLoadingFont.value = true
  fontError.value = ''

  try {
    const buffer = await file.arrayBuffer()
    const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-')
    const fontFamily = `custom-${fontName}-${Date.now()}`

    const fontFace = new FontFace(fontFamily, buffer)
    await fontFace.load()
    document.fonts.add(fontFace)

    emit('upload-font', {
      name: file.name.replace(/\.[^/.]+$/, ''),
      family: fontFamily
    })

    emit('update:typeface', fontFamily)
  } catch (err) {
    console.error('Font loading error:', err)
    fontError.value = 'Failed to load font'
  } finally {
    isLoadingFont.value = false
    event.target.value = ''
  }
}
</script>

<template>
  <div class="constraints">
    <div class="section-title">COLORS</div>

    <!-- Foreground -->
    <div class="color-row">
      <label>FG</label>
      <input
        type="color"
        :value="foreground"
        @input="emit('update:foreground', $event.target.value)"
        class="color-picker"
      />
      <input
        type="text"
        :value="foreground"
        @input="emit('update:foreground', $event.target.value)"
        maxlength="7"
        class="color-text"
      />
    </div>

    <!-- Swap -->
    <button class="swap-btn" @click="swapColors">↕ SWAP</button>

    <!-- Background -->
    <div class="color-row">
      <label>BG</label>
      <input
        type="color"
        :value="background"
        @input="emit('update:background', $event.target.value)"
        class="color-picker"
      />
      <input
        type="text"
        :value="background"
        @input="emit('update:background', $event.target.value)"
        maxlength="7"
        class="color-text"
      />
    </div>

    <div class="section-title">TYPEFACE</div>

    <select
      :value="typeface"
      @change="emit('update:typeface', $event.target.value)"
    >
      <optgroup v-if="typefaces?.length" label="Built-in">
        <option v-for="tf in typefaces" :key="tf.family" :value="tf.family">
          {{ tf.name }}
        </option>
      </optgroup>
      <optgroup v-if="customFonts?.length" label="Custom">
        <option v-for="tf in customFonts" :key="tf.family" :value="tf.family">
          {{ tf.name }}
        </option>
      </optgroup>
    </select>

    <div class="font-preview" :style="{ fontFamily: typeface }">
      Aa Bb Cc 123
    </div>

    <input
      ref="fontFileInput"
      type="file"
      accept=".ttf,.otf,.woff,.woff2"
      @change="handleFontUpload"
      style="display: none"
    />

    <button class="btn" @click="triggerFontUpload" :disabled="isLoadingFont">
      {{ isLoadingFont ? 'LOADING...' : '↑ UPLOAD FONT' }}
    </button>

    <div v-if="fontError" class="error">{{ fontError }}</div>
  </div>
</template>

<style scoped>
.constraints {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: 12px;
  color: var(--color-accent);
  letter-spacing: 0.05em;
  margin-top: var(--space-sm);
}

.section-title:first-child {
  margin-top: 0;
}

.color-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.color-row label {
  width: 24px;
  margin-bottom: 0;
  font-size: 12px;
}

.color-picker {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  cursor: pointer;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border: none;
}

.color-text {
  flex: 1;
  text-transform: uppercase;
}

.swap-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.swap-btn:hover {
  color: var(--color-fg);
  border-color: var(--color-fg);
}

.font-preview {
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  font-size: 16px;
  text-align: center;
}

.error {
  font-size: 12px;
  color: #f00;
}
</style>
