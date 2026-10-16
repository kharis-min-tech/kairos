import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SidebarIcons from './SidebarIcons.vue'
import HomeFeatures from './HomeFeatures.vue'
import SectionClip from './SectionClip.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  // Registered globally so a section page can open with <SectionClip> and a
  // slug, without each page importing it.
  enhanceApp({ app }) {
    app.component('SectionClip', SectionClip)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarIcons),
      'home-features-after': () => h(HomeFeatures),
    })
  },
}
