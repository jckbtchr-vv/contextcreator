<script setup>
import { computed } from 'vue'

const props = defineProps({
  foreground: String,
  background: String,
  typeface: String,
  typefaces: Array
})

const emit = defineEmits([
  'update:foreground',
  'update:background',
  'update:typeface'
])

// Preset color pairs (VV-inspired)
const presets = [
  { name: 'Classic', fg: '#ffffff', bg: '#000000' },
  { name: 'Inverted', fg: '#000000', bg: '#ffffff' },
  { name: 'Warm', fg: '#f5f5dc', bg: '#1a1a1a' },
  { name: 'Blue', fg: '#e0f0ff', bg: '#0a1628' },
  { name: 'Amber', fg: '#ffd700', bg: '#1a1400' },
  { name: 'Mint', fg: '#00ff88', bg: '#001a0d' }
]

function applyPreset(preset) {
  emit('update:foreground', preset.fg)
  emit('update:background', preset.bg)
}

function swapColors() {
  const temp = props.foreground
  emit('update:foreground', props.background)
  emit('update:background', temp)
}
</script>

<template>
  <div class="constraint-panel card">
    <h3 class="panel-title">Constraints</h3>

    <!-- Color Presets -->
    <div class="section">
      <label>Presets</label>
      <div class="presets">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-btn"
          :style="{
            '--preset-fg': preset.fg,
            '--preset-bg': preset.bg
          }"
          @click="applyPreset(preset)"
          :title="preset.name"
        >
          <span class="preset-preview"></span>
        </button>
      </div>
    </div>

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
        <option
          v-for="tf in typefaces"
          :key="tf.family"
          :value="tf.family"
          :style="{ fontFamily: tf.family }"
        >
          {{ tf.name }}
        </option>
      </select>

      <!-- Font Preview -->
      <div
        class="font-preview"
        :style="{ fontFamily: typeface }"
      >
        Aa Bb Cc 123
      </div>
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

/* Presets */
.presets {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.preset-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--preset-bg);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: transform var(--transition-fast);
}

.preset-btn:hover {
  transform: scale(1.1);
}

.preset-preview {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    var(--preset-bg) 50%,
    var(--preset-fg) 50%
  );
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
</style>
