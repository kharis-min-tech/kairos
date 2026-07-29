<script setup lang="ts">
const features = [
  {
    icon: '/KairosDocument/icons/branches.svg',
    title: 'Multi-Branch Management',
    details: 'Manage every church location from one place. Each branch has its own members, fellowships, departments, and reports — fully isolated.',
    link: '/KairosDocument/platform/branches',
    linkText: 'View Branches',
  },
  {
    icon: '/KairosDocument/icons/members.svg',
    title: 'Member Lifecycle',
    details: 'From registration and approval through to departments, fellowships, and attendance — every step of a member\'s journey is tracked.',
    link: '/KairosDocument/church-management/member-lifecycle',
    linkText: 'View Member Lifecycle',
  },
  {
    icon: '/KairosDocument/icons/fellowships.svg',
    title: 'Fellowships',
    details: 'K-Groups, Kharis Express, New Breeds, and more. Includes a map view so members can find the nearest fellowship to them.',
    link: '/KairosDocument/platform/fellowships',
    linkText: 'View Fellowships',
  },
  {
    icon: '/KairosDocument/icons/departments.svg',
    title: 'Departments',
    details: 'Ministry teams with rosters, recruitment pipelines, rota scheduling, and uniform schedules.',
    link: '/KairosDocument/platform/departments',
    linkText: 'View Departments',
  },
  {
    icon: '/KairosDocument/icons/outreach.svg',
    title: 'Outreach & Souls Pipeline',
    details: 'Log evangelism events, capture new souls, assign workers, track follow-ups, and record conversions through a visual pipeline.',
    link: '/KairosDocument/platform/souls-pipeline',
    linkText: 'View Souls Pipeline',
  },
  {
    icon: '/KairosDocument/icons/analytics.svg',
    title: 'Reports & Analytics',
    details: 'Attendance trends, membership growth, soul conversion funnels, and engagement scores — scoped to your role.',
    link: '/KairosDocument/analytics/church-health',
    linkText: 'View Analytics',
  },
]
</script>

<template>
  <div class="hf-list">
    <a
      v-for="f in features"
      :key="f.title"
      :href="f.link"
      class="hf-row"
    >
      <div class="hf-icon">
        <img :src="f.icon" :alt="f.title" />
      </div>
      <div class="hf-content">
        <p class="hf-title">{{ f.title }}</p>
        <p class="hf-details">{{ f.details }}</p>
        <span class="hf-link">{{ f.linkText }} →</span>
      </div>
      <span class="hf-chevron">›</span>
    </a>
  </div>
</template>

<style scoped>
.hf-list {
  display: none;
}

.hf-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.hf-row:last-child {
  border-bottom: none;
  border-radius: 0 0 14px 14px;
}

.hf-row:first-child {
  border-radius: 14px 14px 0 0;
}

.hf-row:active {
  background: var(--vp-c-bg-mute);
}

.hf-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  background: var(--vp-c-brand-soft);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.hf-icon img {
  width: 22px;
  height: 22px;
  opacity: 0.8;
}

.hf-content {
  flex: 1;
  min-width: 0;
}

.hf-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 3px;
  line-height: 1.3;
}

.hf-details {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0 0 5px;
}

.hf-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.hf-chevron {
  font-size: 1.2rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  margin-top: 8px;
  line-height: 1;
}

/* Only show on mobile, hide on desktop */
@media (max-width: 640px) {
  .hf-list {
    display: block;
    border: 1px solid var(--vp-c-border);
    border-radius: 14px;
    overflow: hidden;
    margin: 0 0 32px;
  }
}
</style>
