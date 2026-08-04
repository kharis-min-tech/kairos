import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import SidebarIcons from './SidebarIcons.vue'
import HomeFeatures from './HomeFeatures.vue'
import NavHoverPill from './NavHoverPill.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarIcons),
      'home-features-after': () => h(HomeFeatures),
      'nav-bar-content-after': () => h(NavHoverPill),
    })
  },
}
