<script setup lang="ts">
/**
 * The short clip at the top of a handbook section.
 *
 * Takes the page's slug and plays the clip for the reader's current
 * language, because somebody reading the French handbook should not be shown
 * a video in English.
 *
 * Every language is narrated. Krio and Twi are read by an English voice,
 * since Deepgram has no voice for either, so the pronunciation is
 * approximate — the subtitles carry the real language, and they come from
 * the script rather than from anything the voice was heard to say.
 */
import { computed } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ slug: string }>()
const { lang } = useData()

/** 'fr-FR' -> 'fr'. The root locale reports en-GB. */
const code = computed(() => (lang.value || 'en').split('-')[0])

const file = computed(() => {
  const base = props.slug.replace(/\//g, '-')
  return code.value === 'en' ? base : `${base}-${code.value}`
})


const COPY: Record<string, { heading: string; fallback: string }> = {
  en: {
    heading: 'Watch this in 30 seconds',
    fallback: 'Your browser cannot play this video.',
  },
  fr: {
    heading: 'À voir en 30 secondes',
    fallback: 'Votre navigateur ne peut pas lire cette vidéo.',
  },
  kri: {
    heading: 'Wach dis na 30 sɛkɔn',
    fallback: 'Yu brawza nɔ kin ple dis vidio.',
  },
  tw: {
    heading: 'Hwɛ yei wɔ simma 30 mu',
    fallback: 'Wo browser ntumi nto saa video yi.',
  },
}

const t = computed(() => COPY[code.value] ?? COPY.en)
</script>

<template>
  <figure class="section-clip">
    <figcaption class="section-clip__head">
      {{ t.heading }}
    </figcaption>
    <video
      :key="file"
      class="section-clip__video"
      controls
      preload="metadata"
      playsinline
      :poster="`/clips/${file}.jpg`"
    >
      <source :src="`/clips/${file}.mp4`" type="video/mp4" />
      {{ t.fallback }}
    </video>
  </figure>
</template>

<style scoped>
.section-clip {
  margin: 1.5rem 0 2.25rem;
}
.section-clip__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  margin-bottom: 0.6rem;
}
.section-clip__video {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: #1b1033;
  display: block;
}
</style>
