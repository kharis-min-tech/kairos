<script setup lang="ts">
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'kairos-cookie-consent'
const visible = ref(false)

function load() {
  if (typeof localStorage === 'undefined') return
  if (!localStorage.getItem(STORAGE_KEY)) {
    visible.value = true
  }
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  visible.value = false
}

onMounted(load)
</script>

<template>
  <Teleport to="body">
    <Transition name="consent">
      <div v-if="visible" class="consent-bar" role="banner">
        <div class="consent-bar-inner">
          <div class="consent-bar-content">
            <svg class="consent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="consent-bar-text">
              <p class="consent-bar-title">Please review our policies</p>
              <p class="consent-bar-sub">Terms &amp; Conditions (v2026-07-v1) · Privacy Notice (v2026-07-v1)</p>
              <p class="consent-bar-links">
                <a href="/KairosDocument/legal/terms" @click="dismiss">Read the Terms &amp; Conditions</a>
                <a href="/KairosDocument/legal/privacy" @click="dismiss">Read the Privacy Notice</a>
              </p>
              <button class="consent-accept" @click="dismiss">Accept &amp; continue</button>
            </div>
          </div>
          <button class="consent-close" @click="dismiss" aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.consent-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: calc(100% - 32px);
  max-width: 600px;
}

.consent-bar-inner {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(109,40,217,0.1);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.consent-bar-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.consent-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--vp-c-brand-1);
  margin-top: 2px;
}

.consent-bar-text {
  flex: 1;
  min-width: 0;
}

.consent-bar-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 2px;
}

.consent-bar-sub {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin: 0 0 6px;
}

.consent-bar-links {
  margin: 0 0 10px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.consent-bar-links a {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}

.consent-bar-links a:hover {
  color: var(--vp-c-brand-2);
}

.consent-accept {
  width: 100%;
  padding: 9px 20px;
  border-radius: 9px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
  min-height: 40px;
}

.consent-accept:hover {
  background: var(--vp-c-brand-2);
}

.consent-accept:active {
  transform: scale(0.97);
}

.consent-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-3);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.consent-close svg {
  width: 16px;
  height: 16px;
}

.consent-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.consent-enter-active,
.consent-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.consent-enter-from,
.consent-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

@media (max-width: 480px) {
  .consent-bar {
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: 100%;
  }

  .consent-bar-inner {
    border-radius: 12px 12px 0 0;
    padding: 14px 14px 24px;
  }

  .consent-enter-from,
  .consent-leave-to {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
