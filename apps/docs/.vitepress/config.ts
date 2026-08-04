import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'Kairos',
  description: 'Church Administration System — documentation for Kharis Church.',
  base: '/',
  appearance: 'force-dark',
  ignoreDeadLinks: [/^http:\/\/localhost/],

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: dark)' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
  ],

  themeConfig: {
    siteTitle: 'Kairos',

    nav: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'What is Kairos?', link: '/getting-started/what-is-kairos' },
          { text: 'Core Concepts', link: '/getting-started/core-concepts' },
          { text: 'Your First Church', link: '/getting-started/your-first-church' },
          { text: 'Roles & Permissions', link: '/getting-started/roles-permissions' },
        ],
      },
      {
        text: 'Platform',
        items: [
          { text: 'Dashboard', link: '/platform/dashboard' },
          { text: 'Branches', link: '/platform/branches' },
          { text: 'Regions', link: '/platform/regions' },
          { text: 'Members', link: '/platform/members' },
          { text: 'Attendance', link: '/platform/attendance' },
          { text: 'Fellowships', link: '/platform/fellowships' },
          { text: 'Reports', link: '/platform/reports' },
          { text: 'Departments', link: '/platform/departments' },
          { text: 'New Believers', link: '/platform/new-believers' },
          { text: 'Outreach', link: '/platform/outreach' },
          { text: 'Forms', link: '/platform/forms' },
          { text: 'Souls Pipeline', link: '/platform/souls-pipeline' },
          { text: 'Souls Dashboard', link: '/platform/souls-dashboard' },
          { text: 'Profile', link: '/platform/profile' },
        ],
      },
      {
        text: 'Church Management',
        items: [
          { text: 'Member Lifecycle', link: '/church-management/member-lifecycle' },
          { text: 'Attendance Tracking', link: '/church-management/attendance-tracking' },
          { text: 'Fellowship Management', link: '/church-management/fellowship-management' },
          { text: 'Branch Management', link: '/church-management/branch-management' },
          { text: 'Reporting', link: '/church-management/reporting' },
          { text: 'Department Administration', link: '/church-management/department-administration' },
        ],
      },
      {
        text: 'Administration',
        items: [
          { text: 'User Permissions', link: '/administration/permissions' },
          { text: 'Approvals', link: '/administration/approvals' },
          { text: 'Settings', link: '/administration/settings' },
        ],
      },
      {
        text: 'Analytics',
        items: [
          { text: 'Church Health', link: '/analytics/church-health' },
          { text: 'Engagement', link: '/analytics/engagement' },
          { text: 'Growth Reports', link: '/analytics/growth-reports' },
          { text: 'Attendance Reports', link: '/analytics/attendance-reports' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'What is Kairos?', link: '/getting-started/what-is-kairos' },
          { text: 'Core Concepts', link: '/getting-started/core-concepts' },
          { text: 'Your First Church', link: '/getting-started/your-first-church' },
          { text: 'Roles & Permissions', link: '/getting-started/roles-permissions' },
        ],
      },
      {
        text: 'Platform',
        items: [
          { text: 'Dashboard', link: '/platform/dashboard' },
          { text: 'Branches', link: '/platform/branches' },
          { text: 'Regions', link: '/platform/regions' },
          { text: 'Members', link: '/platform/members' },
          { text: 'Attendance', link: '/platform/attendance' },
          { text: 'Fellowships', link: '/platform/fellowships' },
          { text: 'Reports', link: '/platform/reports' },
          { text: 'Departments', link: '/platform/departments' },
          { text: 'New Believers', link: '/platform/new-believers' },
          { text: 'Outreach', link: '/platform/outreach' },
          { text: 'Forms', link: '/platform/forms' },
          { text: 'Souls Pipeline', link: '/platform/souls-pipeline' },
          { text: 'Souls Dashboard', link: '/platform/souls-dashboard' },
          { text: 'Profile', link: '/platform/profile' },
        ],
      },
      {
        text: 'Church Management',
        items: [
          { text: 'Member Lifecycle', link: '/church-management/member-lifecycle' },
          { text: 'Attendance Tracking', link: '/church-management/attendance-tracking' },
          { text: 'Fellowship Management', link: '/church-management/fellowship-management' },
          { text: 'Branch Management', link: '/church-management/branch-management' },
          { text: 'Reporting', link: '/church-management/reporting' },
          { text: 'Department Administration', link: '/church-management/department-administration' },
        ],
      },
      {
        text: 'Administration',
        items: [
          { text: 'User Permissions', link: '/administration/permissions' },
          { text: 'Approvals', link: '/administration/approvals' },
          { text: 'Settings', link: '/administration/settings' },
        ],
      },
      {
        text: 'Analytics',
        items: [
          { text: 'Church Health', link: '/analytics/church-health' },
          { text: 'Engagement', link: '/analytics/engagement' },
          { text: 'Growth Reports', link: '/analytics/growth-reports' },
          { text: 'Attendance Reports', link: '/analytics/attendance-reports' },
        ],
      },
      {
        text: 'More',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Release Notes', link: '/release-notes' },
          { text: 'Terms & Conditions', link: '/legal/terms' },
          { text: 'Privacy Notice', link: '/legal/privacy' },
        ],
      },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ruthhilary/KairosDocument' },
    ],

    footer: {
      message: 'Kairos — Church Administration System by Kharis Church · <a href="/KairosDocument/legal/terms">Terms</a> · <a href="/KairosDocument/legal/privacy">Privacy</a>',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },


  },
});
