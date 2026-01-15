<script setup>
import { ref, computed, watch } from 'vue'
import { testApiKey } from '../services/geminiService'

const props = defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

const localApiKey = ref(props.modelValue || '')
const isValidating = ref(false)
const validationStatus = ref(null)
const showKey = ref(false)

watch(() => props.modelValue, (newVal) => {
  localApiKey.value = newVal || ''
})

function updateApiKey() {
  emit('update:modelValue', localApiKey.value)
  validationStatus.value = null
}

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
</script>

<template>
  <div class="api-settings">
    <div class="section-title">API KEY</div>

    <div class="input-row">
      <input
        :type="showKey ? 'text' : 'password'"
        v-model="localApiKey"
        @input="updateApiKey"
        placeholder="GEMINI API KEY"
        :class="{ valid: validationStatus === 'valid', invalid: validationStatus === 'invalid' }"
      />
      <button class="icon-btn" @click="showKey = !showKey" type="button">
        {{ showKey ? '◉' : '○' }}
      </button>
    </div>

    <div class="actions">
      <button class="btn" @click="validateKey" :disabled="isValidating || !localApiKey">
        {{ isValidating ? 'CHECKING...' : 'VALIDATE' }}
      </button>
      <span v-if="validationStatus === 'valid'" class="status valid">OK</span>
      <span v-if="validationStatus === 'invalid'" class="status invalid">FAIL</span>
    </div>

    <a href="https://aistudio.google.com/apikey" target="_blank" class="link">
      GET API KEY →
    </a>
  </div>
</template>

<style scoped>
.api-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: 12px;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}

.input-row {
  display: flex;
  gap: var(--space-xs);
}

.input-row input {
  flex: 1;
}

.input-row input.valid {
  border-color: #0f0;
}

.input-row input.invalid {
  border-color: #f00;
}

.icon-btn {
  width: 32px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 12px;
}

.icon-btn:hover {
  color: var(--color-fg);
  border-color: var(--color-fg);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status {
  font-size: 12px;
  text-transform: uppercase;
}

.status.valid {
  color: #0f0;
}

.status.invalid {
  color: #f00;
}

.link {
  font-size: 12px;
  color: var(--color-accent);
  text-decoration: none;
}

.link:hover {
  color: var(--color-fg);
}
</style>
