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
      width="1920"
      height="1080"
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
  /* The box has to be the right shape before a single byte of video
     arrives. Without this the element is the browser's default 2:1 until
     `preload="metadata"` lands, then snaps to 16:9 -- and because metadata
     is fetched lazily, that snap happens mid-scroll and shoves the rest of
     the page, which reads as the video glitching. The intrinsic width and
     height attributes cover browsers that ignore aspect-ratio. */
  aspect-ratio: 16 / 9;
  height: auto;
  display: block;
  /* No frame of any kind, in either theme: the clip sits in the prose the
     way a paragraph does rather than in a card. The background has to be
     transparent rather than a theme colour, because any fill would show as
     a box in the moment before the poster paints and again behind the
     letterboxing. */
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
/* The frame goes, but not the keyboard focus ring -- it is the only thing
   telling someone tabbing through the page where they are. It is drawn only
   for keyboard focus, so it never appears for a mouse user. */
.section-clip__video:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
