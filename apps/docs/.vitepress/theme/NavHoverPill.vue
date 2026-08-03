<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// ── Hover pill (desktop) ──────────────────────────────────────────────────────

let pill: HTMLElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let isTouch = false

function getNavItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '.VPNavBarMenu .VPNavBarMenuLink, .VPNavBarMenu .VPFlyoutButton'
    )
  )
}

function moveTo(el: HTMLElement) {
  if (!pill) return
  if (hideTimer) clearTimeout(hideTimer)
  const rect = el.getBoundingClientRect()
  const pillH = 36
  const top = rect.top + rect.height / 2 - pillH / 2
  pill.style.width = `${rect.width + 12}px`
  pill.style.transform = `translateX(${rect.left - 6}px) translateY(${top}px)`
  pill.style.opacity = '1'
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (pill) pill.style.opacity = '0'
  }, 120)
}

function onMouseEnter(e: MouseEvent) {
  if (isTouch) return
  moveTo(e.currentTarget as HTMLElement)
}

function onMouseLeave() {
  if (isTouch) return
  scheduleHide()
}

// ── Touch flyout dismiss overlay ──────────────────────────────────────────────
// VitePress VPFlyout opens via Vue reactive state on mouseenter.
// On iOS/iPadOS the first tap fires mouseenter (opens it). We can't
// set aria-expanded or call blur to close it — Vue will overwrite those.
//
// Solution: when a flyout is open, inject a full-screen transparent overlay
// behind the nav. Tapping it triggers a real mouseleave on the flyout which
// Vue responds to by setting n.value = false, closing the menu naturally.

let overlay: HTMLElement | null = null

function getOpenFlyout(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.VPNavBarMenu .VPFlyout:hover') ??
         document.querySelector<HTMLElement>('.VPNavBarMenu .VPFlyout .menu[style*="visible"]')?.closest('.VPFlyout') ?? null
}

function isAnyFlyoutOpen(): boolean {
  // Check if any flyout menu is currently visible
  return !!document.querySelector('.VPNavBarMenu .VPFlyout .menu') &&
    Array.from(document.querySelectorAll<HTMLElement>('.VPNavBarMenu .VPFlyout')).some(f => {
      const menu = f.querySelector<HTMLElement>('.menu')
      if (!menu) return false
      const style = getComputedStyle(menu)
      return style.visibility === 'visible' && style.opacity !== '0'
    })
}

function showOverlay() {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.id = 'nav-touch-overlay'
  // Full screen, sits just below the nav bar, captures taps
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9998',
    background: 'transparent',
    WebkitTapHighlightColor: 'transparent',
  })
  overlay.addEventListener('touchend', dismissViaOverlay, { passive: false })
  overlay.addEventListener('click', dismissViaOverlay)
  document.body.appendChild(overlay)
}

function removeOverlay() {
  if (!overlay) return
  overlay.removeEventListener('touchend', dismissViaOverlay)
  overlay.removeEventListener('click', dismissViaOverlay)
  overlay.remove()
  overlay = null
}

function dismissViaOverlay(e: Event) {
  e.preventDefault()
  // Fire a real mouseleave on every open flyout — Vue listens to this and closes
  document.querySelectorAll<HTMLElement>('.VPNavBarMenu .VPFlyout').forEach(flyout => {
    flyout.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }))
  })
  removeOverlay()
}

// Poll for open flyouts after each touch so we know when to show the overlay
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (isAnyFlyoutOpen()) {
      showOverlay()
    } else {
      removeOverlay()
    }
  }, 80)
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

onMounted(() => {
  if (typeof document === 'undefined') return

  pill = document.createElement('div')
  pill.id = 'nav-hover-pill'
  document.body.appendChild(pill)

  window.addEventListener('touchstart', () => {
    isTouch = true
    startPolling()
  }, { once: true, passive: true })

  requestAnimationFrame(() => {
    const items = getNavItems()
    items.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter)
      el.addEventListener('mouseleave', onMouseLeave)
    })
  })
})

onUnmounted(() => {
  getNavItems().forEach(el => {
    el.removeEventListener('mouseenter', onMouseEnter)
    el.removeEventListener('mouseleave', onMouseLeave)
  })
  stopPolling()
  removeOverlay()
  pill?.remove()
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template></template>
