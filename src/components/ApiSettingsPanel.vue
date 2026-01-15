<script setup>
import { ref, computed, watch } from 'vue'
import { testApiKey } from '../services/geminiService'

const props = defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

const localApiKey = ref(props.modelValue || '')
const isValidating = ref(false)
const validationStatus = ref(null) // null, 'valid', 'invalid'
const showKey = ref(false)

// Sync with prop
watch(() => props.modelValue, (newVal) => {
  localApiKey.value = newVal || ''
})

// Update parent on change
function updateApiKey() {
  emit('update:modelValue', localApiKey.value)
  validationStatus.value = null
}

// Validate the API key
async function validateKey() {
  if (!localApiKey.value) {
    validationStatus.value = 'invalid'
    return
  }

  isValidating.value = true
  validationStatus.value = null

  try {
    const isValid = await testApiKey(localApiKey.value)
    validationStatus.value = isValid ? 'valid' : 'invalid'
    if (isValid) {
      emit('update:modelValue', localApiKey.value)
    }
  } catch {
    validationStatus.value = 'invalid'
  } finally {
    isValidating.value = false
  }
}

const maskedKey = computed(() => {
  if (!localApiKey.value) return ''
  if (showKey.value) return localApiKey.value
  return localApiKey.value.slice(0, 8) + '••••••••' + localApiKey.value.slice(-4)
})

const statusClass = computed(() => {
  if (validationStatus.value === 'valid') return 'status-valid'
  if (validationStatus.value === 'invalid') return 'status-invalid'
  return ''
})
</script>

<template>
  <div class="api-settings">
    <h3 class="panel-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      API Settings
    </h3>

    <div class="form-group">
      <label for="apiKey">Gemini API Key</label>
      <div class="api-key-input">
        <input
          id="apiKey"
          :type="showKey ? 'text' : 'password'"
          v-model="localApiKey"
          @input="updateApiKey"
          placeholder="Enter your Gemini API key"
          :class="statusClass"
        />
        <button
          class="toggle-visibility"
          @click="showKey = !showKey"
          type="button"
          :title="showKey ? 'Hide key' : 'Show key'"
        >
          <svg v-if="showKey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      <div class="api-actions">
        <button
          class="btn btn-sm"
          @click="validateKey"
          :disabled="isValidating || !localApiKey"
        >
          {{ isValidating ? 'Validating...' : 'Validate Key' }}
        </button>
        <span v-if="validationStatus === 'valid'" class="validation-msg valid">
          ✓ Valid
        </span>
        <span v-if="validationStatus === 'invalid'" class="validation-msg invalid">
          ✗ Invalid key
        </span>
      </div>

      <p class="help-text">
        Get your API key from
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">
          Google AI Studio
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.api-settings {
  background: var(--color-muted);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-md);
  color: var(--color-fg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.api-key-input {
  display: flex;
  gap: var(--space-xs);
}

.api-key-input input {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.api-key-input input.status-valid {
  border-color: #00ff88;
}

.api-key-input input.status-invalid {
  border-color: #ff4444;
}

.toggle-visibility {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  cursor: pointer;
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-visibility:hover {
  color: var(--color-fg);
  border-color: var(--color-fg);
}

.api-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.75rem;
}

.validation-msg {
  font-size: 0.75rem;
  font-weight: 500;
}

.validation-msg.valid {
  color: #00ff88;
}

.validation-msg.invalid {
  color: #ff4444;
}

.help-text {
  font-size: 0.75rem;
  color: var(--color-accent);
}

.help-text a {
  color: var(--color-fg);
  text-decoration: underline;
}

.help-text a:hover {
  color: #00ff88;
}
</style>
