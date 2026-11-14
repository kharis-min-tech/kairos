/**
 * The handbook's shape, defined once for every language.
 *
 * The nav and the sidebar used to be two hand-maintained copies of the same
 * tree; four languages would have made eight. Here each page is listed once
 * and carries its title in all four, so a locale cannot quietly fall back to
 * an English sidebar when someone adds a page.
 *
 * `slug` is the file path under the locale directory and never changes with
 * language: `/fr/platform/members` is the French page, and the English URLs
 * that are already linked from the app and from outside keep working.
 */
export type Lang = 'en' | 'fr' | 'kri' | 'tw';

export const LANGS: Lang[] = ['en', 'fr', 'kri', 'tw'];

type L10n = Record<Lang, string>;

interface Page {
  slug: string;
  label: L10n;
}

interface Section {
  label: L10n;
  /** 'More' is a sidebar-only group; the top nav stays short. */
  navless?: boolean;
  items: Page[];
}

export const SECTIONS: Section[] = [
  {
    label: {
      en: 'Getting Started',
      fr: 'Premiers pas',
      kri: 'Fɔ Stat',
      tw: 'Mfitiaseɛ',
    },
    items: [
      {
        slug: 'getting-started/introduction',
        label: { en: 'Introduction', fr: 'Introduction', kri: 'Intrɔdɔkshɔn', tw: 'Nnianim Asɛm' },
      },
      {
        slug: 'getting-started/video-tour',
        label: { en: 'Video Tour', fr: 'Visite guidée en vidéo', kri: 'Vidio Tua', tw: 'Video Akwantuo' },
      },
      {
        slug: 'getting-started/what-is-kairos',
        label: { en: 'What is Kairos?', fr: 'Qu’est-ce que Kairos ?', kri: 'Wetin na Kairos?', tw: 'Ɛdeɛn ne Kairos?' },
      },
      {
        slug: 'getting-started/core-concepts',
        label: { en: 'Core Concepts', fr: 'Notions clés', kri: 'Di Mayn Tin Dɛn', tw: 'Nsɛm Atitire' },
      },
      {
        slug: 'getting-started/your-first-church',
        label: { en: 'Your First Church', fr: 'Votre première église', kri: 'Yu Fɔs Chɔch', tw: 'W’asɔre a Ɛdi Kan' },
      },
      {
        slug: 'getting-started/roles-permissions',
        label: { en: 'Roles & Permissions', fr: 'Rôles et autorisations', kri: 'Rol ɛn Pamishɔn dɛn', tw: 'Dibea ne Kwan a Wɔma' },
      },
    ],
  },
  {
    label: { en: 'Platform', fr: 'Plateforme', kri: 'Di Platfɔm', tw: 'Nhyehyɛeɛ no' },
    items: [
      { slug: 'platform/dashboard', label: { en: 'Dashboard', fr: 'Tableau de bord', kri: 'Dashbɔd', tw: 'Dashboard' } },
      { slug: 'platform/branches', label: { en: 'Branches', fr: 'Antennes', kri: 'Branch dɛn', tw: 'Asɔre Mmaa' } },
      { slug: 'platform/regions', label: { en: 'Regions', fr: 'Régions', kri: 'Rijɔn dɛn', tw: 'Mpɔtam' } },
      { slug: 'platform/members', label: { en: 'Members', fr: 'Membres', kri: 'Mɛmba dɛn', tw: 'Asɔrefoɔ' } },
      { slug: 'platform/membership', label: { en: 'Membership', fr: 'Adhésion', kri: 'Mɛmbaship', tw: 'Asɔrefoɔ Mufoɔ' } },
      { slug: 'platform/attendance', label: { en: 'Attendance', fr: 'Présence', kri: 'Atɛndans', tw: 'Mmaeɛ' } },
      { slug: 'platform/fellowships', label: { en: 'Fellowships', fr: 'Cellules', kri: 'Fɛloship dɛn', tw: 'Fekuo' } },
      { slug: 'platform/reports', label: { en: 'Reports', fr: 'Rapports', kri: 'Ripɔt dɛn', tw: 'Amanneɛbɔ' } },
      { slug: 'platform/departments', label: { en: 'Departments', fr: 'Départements', kri: 'Dipatmɛnt dɛn', tw: 'Adwumakuo' } },
      { slug: 'platform/new-believers', label: { en: 'New Believers', fr: 'Nouveaux croyants', kri: 'Nyu Biliva dɛn', tw: 'Gyidifoɔ Foforɔ' } },
      { slug: 'platform/follow-ups', label: { en: 'Follow-ups', fr: 'Suivis', kri: 'Fɔlo ɔp dɛn', tw: 'Nkɔdi Akyi' } },
      { slug: 'platform/concerns', label: { en: 'Concerns', fr: 'Préoccupations', kri: 'Wɔri dɛn', tw: 'Nsɛm a Ɛha Adwene' } },
      { slug: 'platform/outreach', label: { en: 'Outreach', fr: 'Évangélisation', kri: 'Awtrich', tw: 'Asɛmpaka' } },
      { slug: 'platform/forms', label: { en: 'Forms', fr: 'Formulaires', kri: 'Fɔm dɛn', tw: 'Nkrataa' } },
      { slug: 'platform/souls-pipeline', label: { en: 'Souls Pipeline', fr: 'Parcours des âmes', kri: 'Sol Paiplain', tw: 'Akra Kwan' } },
      { slug: 'platform/souls-dashboard', label: { en: 'Souls Dashboard', fr: 'Tableau de bord des âmes', kri: 'Sol Dashbɔd', tw: 'Akra Dashboard' } },
      { slug: 'platform/profile', label: { en: 'Profile', fr: 'Profil', kri: 'Prɔfayl', tw: 'Wo Nsɛm' } },
    ],
  },
  {
    label: {
      en: 'Church Management',
      fr: 'Gestion de l’église',
      kri: 'Aw fɔ Ron di Chɔch',
      tw: 'Asɔre Sohwɛ',
    },
    items: [
      { slug: 'church-management/member-lifecycle', label: { en: 'Member Lifecycle', fr: 'Parcours du membre', kri: 'Di Mɛmba in Jɔni', tw: 'Ɔmanfoɔ Kwan' } },
      { slug: 'church-management/attendance-tracking', label: { en: 'Attendance Tracking', fr: 'Suivi des présences', kri: 'Aw fɔ Fɔlo Atɛndans', tw: 'Mmaeɛ Nhwɛsoɔ' } },
      { slug: 'church-management/fellowship-management', label: { en: 'Fellowship Management', fr: 'Gestion des cellules', kri: 'Aw fɔ Ron Fɛloship', tw: 'Fekuo Sohwɛ' } },
      { slug: 'church-management/branch-management', label: { en: 'Branch Management', fr: 'Gestion des antennes', kri: 'Aw fɔ Ron Branch', tw: 'Asɔre Baa Sohwɛ' } },
      { slug: 'church-management/reporting', label: { en: 'Reporting', fr: 'Rapports', kri: 'Aw fɔ Mek Ripɔt', tw: 'Amanneɛbɔ Yɛ' } },
      { slug: 'church-management/department-administration', label: { en: 'Department Administration', fr: 'Administration des départements', kri: 'Aw fɔ Ron Dipatmɛnt', tw: 'Adwumakuo Sohwɛ' } },
    ],
  },
  {
    label: { en: 'Administration', fr: 'Administration', kri: 'Adminstreshɔn', tw: 'Sohwɛ' },
    items: [
      { slug: 'administration/permissions', label: { en: 'User Permissions', fr: 'Autorisations des utilisateurs', kri: 'Yuza Pamishɔn dɛn', tw: 'Kwan a Wɔma Nnipa' } },
      { slug: 'administration/capabilities', label: { en: 'Capability Reference', fr: 'Référence des capacités', kri: 'Di Lis fɔ Ɔl Pamishɔn', tw: 'Tumi Nhwɛmu' } },
      { slug: 'administration/approvals', label: { en: 'Approvals', fr: 'Approbations', kri: 'Aproval dɛn', tw: 'Ɔpene' } },
      { slug: 'administration/settings', label: { en: 'Settings', fr: 'Paramètres', kri: 'Sɛtin dɛn', tw: 'Nhyehyɛeɛ' } },
    ],
  },
  {
    label: { en: 'Analytics', fr: 'Analyses', kri: 'Analitiks', tw: 'Nsɛm Nhwɛmu' },
    items: [
      { slug: 'analytics/church-health', label: { en: 'Church Health', fr: 'Santé de l’église', kri: 'Di Chɔch in Ɛlt', tw: 'Asɔre Akwahosan' } },
      { slug: 'analytics/engagement', label: { en: 'Engagement', fr: 'Engagement', kri: 'Aw Pipul de Tek Pat', tw: 'Nkitahodie' } },
      { slug: 'analytics/growth-reports', label: { en: 'Growth Reports', fr: 'Rapports de croissance', kri: 'Groth Ripɔt dɛn', tw: 'Nkɔsoɔ Amanneɛbɔ' } },
      { slug: 'analytics/attendance-reports', label: { en: 'Attendance Reports', fr: 'Rapports de présence', kri: 'Atɛndans Ripɔt dɛn', tw: 'Mmaeɛ Amanneɛbɔ' } },
    ],
  },
  {
    label: { en: 'More', fr: 'Plus', kri: 'Mɔ', tw: 'Pii' },
    navless: true,
    items: [
      { slug: 'faq', label: { en: 'FAQ', fr: 'Questions fréquentes', kri: 'Kwɛstyɔn dɛn we Pipul de Aks', tw: 'Nsɛmmisa a Ɛtaa Ba' } },
      { slug: 'release-notes', label: { en: 'Release Notes', fr: 'Notes de version', kri: 'Wetin Nyu', tw: 'Nsakraeɛ Nsɛm' } },
    ],
  },
];

/** `/platform/members` for English, `/fr/platform/members` for the rest. */
export const href = (lang: Lang, slug: string) =>
  lang === 'en' ? `/${slug}` : `/${lang}/${slug}`;

export const navFor = (lang: Lang) =>
  SECTIONS.filter((s) => !s.navless).map((s) => ({
    text: s.label[lang],
    items: s.items.map((p) => ({ text: p.label[lang], link: href(lang, p.slug) })),
  }));

export const sidebarFor = (lang: Lang) =>
  SECTIONS.map((s) => ({
    text: s.label[lang],
    items: s.items.map((p) => ({ text: p.label[lang], link: href(lang, p.slug) })),
  }));
