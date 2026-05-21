# Kairos - Design Requirements

> **Palette source of truth: `DESIGN.md` (root) — "Modern Sanctuary".** Primary `#5D3FD3`, gold `#f8b537`, gradient `from-[#451ebb] to-[#5d3fd3]`. The palette below has been aligned to those values; some derived tokens (lighter/darker shades, contrast ratios computed against old hexes) still need to be recomputed against the new primary and gold. When the implementation pulls from this doc, defer to `DESIGN.md` if there's any conflict.

## Document Overview
This document defines the user experience (UX) and user interface (UI) design requirements for Kairos church administration platform. It covers design principles, visual design system, component specifications, user flows, and accessibility requirements.

**Design Principles:**
- **Accessible First:** WCAG 2.1 AA compliance is mandatory
- **Intuitive:** Church workers of all technical levels can use the system
- **Efficient:** Minimize clicks and cognitive load for common tasks
- **Responsive:** Works seamlessly on desktop and mobile browsers
- **Consistent:** Unified design language across all features

---

## Table of Contents
1. [Design System](#design-system)
2. [Layout & Navigation](#layout--navigation)
3. [User Personas & Journeys](#user-personas--journeys)
4. [Screen Specifications](#screen-specifications)
5. [Component Library](#component-library)
6. [Accessibility Requirements](#accessibility-requirements)
7. [Responsive Design](#responsive-design)

---

## Design System

### Color Palette

**Primary Colors:**
```
Purple (Primary):
- Purple 900: #4C1D95 (Dark - headers, emphasis)
- Purple 700: #5D3FD3 (Main - primary actions — Modern Sanctuary)
- Purple 500: #8B5CF6 (Light - hover states)
- Purple 100: #EDE9FE (Very light - backgrounds)

Blue (Secondary):
- Blue 900: #1E3A8A (Dark - links, info)
- Blue 700: #1D4ED8 (Main - secondary actions)
- Blue 500: #3B82F6 (Light - hover states)
- Blue 100: #DBEAFE (Very light - backgrounds)

Gold (Accent):
- Gold 900: #78350F (Dark - highlights)
- Gold 600: #f8b537 (Main - achievements, focus rings, "Gold Glow" — Modern Sanctuary)
- Gold 400: #FBBF24 (Light - warnings)
- Gold 100: #FEF3C7 (Very light - backgrounds)

Burgundy (Alert):
- Burgundy 900: #7F1D1D (Dark - critical errors)
- Burgundy 700: #B91C1C (Main - errors, alerts)
- Burgundy 500: #EF4444 (Light - warnings)
- Burgundy 100: #FEE2E2 (Very light - backgrounds)
```

**Neutral Colors:**
```
Gray Scale:
- Gray 900: #111827 (Text - primary)
- Gray 700: #374151 (Text - secondary)
- Gray 500: #6B7280 (Text - tertiary)
- Gray 300: #D1D5DB (Borders)
- Gray 100: #F3F4F6 (Backgrounds)
- Gray 50: #F9FAFB (Page backgrounds)
- White: #FFFFFF (Cards, modals)
```

**Semantic Colors:**
```
Success: Emerald 600 (#059669)   <!-- note: gold is for achievements, not success state -->
Achievement / Verified: Gold 600 (#f8b537)
Warning: Gold 400 (#FBBF24)
Error: Burgundy 700 (#B91C1C)
Info: Blue 700 (#1D4ED8)
```

### Typography

**Font Family:**
- Primary: Inter (sans-serif) - for UI and body text
- Monospace: JetBrains Mono - for code, IDs, technical data

**Font Sizes:**
```
Display: 48px / 3rem (Page titles)
H1: 36px / 2.25rem (Section headers)
H2: 30px / 1.875rem (Card headers)
H3: 24px / 1.5rem (Subsection headers)
H4: 20px / 1.25rem (Component headers)
Body Large: 18px / 1.125rem (Emphasis text)
Body: 16px / 1rem (Default text)
Body Small: 14px / 0.875rem (Secondary text)
Caption: 12px / 0.75rem (Labels, hints)
```

**Font Weights:**
```
Regular: 400 (Body text)
Medium: 500 (Emphasis)
Semibold: 600 (Headings)
Bold: 700 (Strong emphasis)
```

**Line Heights:**
```
Tight: 1.25 (Headings)
Normal: 1.5 (Body text)
Relaxed: 1.75 (Long-form content)
```

### Spacing Scale

Based on 4px base unit:
```
xs: 4px / 0.25rem
sm: 8px / 0.5rem
md: 16px / 1rem
lg: 24px / 1.5rem
xl: 32px / 2rem
2xl: 48px / 3rem
3xl: 64px / 4rem
```

### Border Radius

```
sm: 4px (Buttons, inputs)
md: 8px (Cards, modals)
lg: 12px (Large containers)
full: 9999px (Pills, avatars)
```

### Shadows

```
sm: 0 1px 2px rgba(0, 0, 0, 0.05) (Subtle elevation)
md: 0 4px 6px rgba(0, 0, 0, 0.1) (Cards)
lg: 0 10px 15px rgba(0, 0, 0, 0.1) (Modals, dropdowns)
xl: 0 20px 25px rgba(0, 0, 0, 0.15) (Overlays)
```

### Icons

**Icon Library:** Lucide React (consistent, accessible, tree-shakeable)

**Icon Sizes:**
```
xs: 12px (Inline with small text)
sm: 16px (Inline with body text)
md: 20px (Buttons, navigation)
lg: 24px (Section headers)
xl: 32px (Empty states, illustrations)
```

---

## Layout & Navigation

### Application Shell

**Structure:**
```
┌─────────────────────────────────────────────┐
│  Top Bar (64px height)                      │
│  [Logo] [Branch Selector] ... [User Menu]  │
├──────┬──────────────────────────────────────┤
│      │                                      │
│ Side │  Main Content Area                   │
│ bar  │  (Scrollable)                        │
│      │                                      │
│ 240px│                                      │
│      │                                      │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

### Top Bar

**Components:**
- **Logo** (left): Kairos logo + wordmark
- **Branch Selector** (left-center): Dropdown to switch branches (Admins/Pastors only)
- **Search** (center): Global search (members, souls, donations)
- **Notifications** (right): Bell icon with badge count
- **User Menu** (right): Avatar + name, dropdown menu

**Top Bar Actions:**
```
User Menu Dropdown:
├── My Profile
├── Settings
├── Help & Support
├── Divider
└── Sign Out
```

### Sidebar Navigation

**Collapsible:** Yes (hamburger icon in top bar)
**Width:** 240px (expanded), 64px (collapsed)
**Behavior:** Persists state in localStorage

**Navigation Structure:**
```
Dashboard (Home icon)
├── Overview

Members (Users icon)
├── All Members
├── Pending Approvals
└── Import/Export

Attendance (Calendar Check icon)
├── Record Service
├── Record Fellowship
└── View Reports

Evangelism (Heart Handshake icon)
├── Capture Soul
├── My Souls
├── All Souls
└── Outreach Programs

Donations (Coins icon)
├── Record Donation
├── Donation History
└── Reports

Departments (Building icon)
├── All Departments
└── Join Requests

Fellowships (Users icon)
├── All Fellowships
└── My Fellowship

Forms (File Text icon)
├── Form Builder
├── My Forms
└── Submissions

Reports (Bar Chart icon)
├── Dashboard
├── Attendance
├── Donations
└── Evangelism

Settings (Settings icon) [Admin/Pastor only]
├── Branches
├── Regions
├── Roles
└── System Config
```

**Active State:** Purple 700 background, white text
**Hover State:** Gray 100 background
**Icon + Label:** Always visible when expanded, icon-only when collapsed

### Breadcrumbs

Display current location for deep navigation:
```
Home > Members > John Doe
```

**Style:** Gray 500 text, Purple 700 for current page

---

## User Personas & Journeys

### Persona 1: Church Administrator (Sarah)

**Profile:**
- Age: 35
- Role: Church Administrator
- Tech Savvy: Medium
- Goals: Manage all church operations efficiently, generate reports for leadership
- Pain Points: Scattered data across spreadsheets, manual processes

**Key User Journeys:**

**Journey 1: Approve New Member**
1. Receives notification: "New member registration pending"
2. Clicks notification → navigates to Members > Pending Approvals
3. Reviews member details (name, contact, branch)
4. Clicks "Approve" button
5. Confirmation modal: "Approve John Doe?"
6. Clicks "Confirm"
7. Success message: "Member approved. Welcome email sent."
8. Member moves to active members list

**Journey 2: Record Cash Donation**
1. Navigates to Donations > Record Donation
2. Selects "Manual Entry" tab
3. Searches for member by name
4. Enters amount, selects purpose (Offering/Tithe/Building Fund)
5. Selects payment method (Cash)
6. Clicks "Record Donation"
7. Success message: "Donation recorded"
8. Option to print receipt

---

### Persona 2: Pastor (David)

**Profile:**
- Age: 45
- Role: Branch Pastor
- Tech Savvy: Low-Medium
- Goals: Oversee branch operations, track member engagement, view reports
- Pain Points: Limited time, needs quick insights

**Key User Journeys:**

**Journey 1: View Branch Dashboard**
1. Logs in → lands on Dashboard
2. Sees branch-specific metrics:
   - Total members: 250
   - Service attendance (last Sunday): 85%
   - Donations (this month): £12,500
   - Souls captured (this month): 15
3. Clicks "View Attendance Trends" → sees chart
4. Identifies declining attendance in specific fellowship
5. Clicks fellowship name → sees member list
6. Contacts fellowship leader

**Journey 2: Record Service Attendance**
1. Navigates to Attendance > Record Service
2. Selects service date and type (Sunday Service)
3. Sees list of all branch members
4. Uses bulk select to mark present members
5. Marks specific members as "Virtual"
6. Clicks "Save Attendance"
7. Success message: "Attendance recorded for 210 members"

---

### Persona 3: Department Leader (Grace)

**Profile:**
- Age: 28
- Role: Choir Department Leader
- Tech Savvy: High
- Goals: Manage choir members, track attendance, communicate with team
- Pain Points: Coordinating schedules, tracking who's available

**Key User Journeys:**

**Journey 1: Approve Department Join Request**
1. Receives notification: "New join request for Choir"
2. Navigates to Departments > Choir > Join Requests
3. Sees request from "Mary Johnson"
4. Clicks "View Profile" → reviews member details
5. Clicks "Approve"
6. Adds note: "Soprano, experienced"
7. Success message: "Mary added to Choir"
8. Mary receives welcome notification

**Journey 2: Send Broadcast Message**
1. Navigates to Departments > Choir
2. Clicks "Send Message" button
3. Selects recipients: "All Choir Members"
4. Enters subject: "Rehearsal Tomorrow"
5. Enters message: "Reminder: Rehearsal at 6 PM..."
6. Clicks "Send"
7. Success message: "Message sent to 45 members"

---

### Persona 4: Church Member (John)

**Profile:**
- Age: 32
- Role: Regular Member
- Tech Savvy: Medium
- Goals: View profile, make donations, register for events, view notifications
- Pain Points: Wants self-service, doesn't want to bother admin

**Key User Journeys:**

**Journey 1: Make Online Donation**
1. Logs in → navigates to Donations
2. Clicks "Make Donation"
3. Enters amount: £50
4. Selects purpose: "Tithe"
5. Enters card details (Stripe)
6. Clicks "Donate"
7. Payment processing...
8. Success message: "Thank you! Receipt sent to email"
9. Views donation in history

**Journey 2: Update Profile**
1. Clicks user menu → "My Profile"
2. Sees profile details (name, email, phone, address)
3. Clicks "Edit" button
4. Updates phone number
5. Uploads new profile photo
6. Clicks "Save Changes"
7. Success message: "Profile updated"

---

## Screen Specifications

### 1. Dashboard (Landing Page)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Dashboard                                  │
│  [Date Range Selector: Last 30 Days ▼]     │
├─────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Members  │ │ Donations│ │  Souls   │   │
│  │   250    │ │ £12,500  │ │    15    │   │
│  │  +5 ↑    │ │  +8% ↑   │ │   +3 ↑   │   │
│  └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────┤
│  Attendance Trends (Chart)                  │
│  [Line chart showing last 8 weeks]          │
├─────────────────────────────────────────────┤
│  Recent Activity                            │
│  • John Doe joined Choir (2 hours ago)     │
│  • £100 donation from Mary (5 hours ago)   │
│  • New soul captured by Grace (1 day ago)  │
└─────────────────────────────────────────────┘
```

**Components:**
- **Stat Cards:** 3-4 cards showing key metrics
  - Icon (left), Label (top), Value (large), Change indicator (bottom)
  - Colors: Purple for members, Blue for donations, Gold for souls
- **Chart:** Line chart (Chart.js or Recharts)
  - X-axis: Weeks, Y-axis: Attendance %
  - Tooltip on hover
- **Activity Feed:** List of recent actions
  - Avatar, action text, timestamp
  - Max 10 items, "View All" link

**Responsive:**
- Desktop: 3 columns for stat cards
- Tablet: 2 columns
- Mobile: 1 column, stacked

---

### 2. Member List Page

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Members                                    │
│  [+ Add Member] [Import] [Export]           │
├─────────────────────────────────────────────┤
│  [Search...] [Filter ▼] [Branch ▼]         │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │ Name      │ Email    │ Branch │ ... │   │
│  ├─────────────────────────────────────┤   │
│  │ John Doe  │ john@... │ Main   │ ... │   │
│  │ Mary Jane │ mary@... │ Main   │ ... │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│  [< Previous] Page 1 of 10 [Next >]         │
└─────────────────────────────────────────────┘
```

**Components:**
- **Action Buttons:** Primary (Add Member), Secondary (Import, Export)
- **Search Bar:** Full-width, icon left, placeholder "Search by name, email, or phone"
- **Filters:** Dropdown menus
  - Status: All, Active, Inactive, Pending
  - Branch: All, Main, Satellite, etc.
  - Department: All, Choir, Ushers, etc.
- **Data Table:**
  - Columns: Avatar, Name, Email, Phone, Branch, Status, Actions
  - Sortable columns (click header)
  - Row actions: View, Edit, Delete (three-dot menu)
  - Checkbox for bulk selection
- **Pagination:** Previous/Next buttons, page numbers, "Showing X-Y of Z"

**Interactions:**
- Click row → navigate to member detail page
- Hover row → highlight (Gray 50 background)
- Click checkbox → enable bulk actions (Delete, Export, Assign to Department)

---

### 3. Member Detail Page

**Layout:**
```
┌─────────────────────────────────────────────┐
│  < Back to Members                          │
│  ┌────────┐  John Doe                       │
│  │ Avatar │  john.doe@email.com             │
│  │        │  +44 7700 900000                │
│  └────────┘  [Edit Profile] [Delete]        │
├─────────────────────────────────────────────┤
│  Tabs: [Profile] [Donations] [Attendance]  │
├─────────────────────────────────────────────┤
│  Profile Tab:                               │
│  Personal Information                       │
│  • Date of Birth: 01/01/1990               │
│  • Gender: Male                             │
│  • Address: 123 Main St, London            │
│                                             │
│  Church Information                         │
│  • Home Branch: Main                        │
│  • Membership Date: 01/01/2020             │
│  • Status: Active                           │
│                                             │
│  Departments                                │
│  • Choir (Joined: 01/01/2021)              │
│  • Ushers (Joined: 01/01/2022)             │
│                                             │
│  Fellowship                                 │
│  • K-Group Alpha (Joined: 01/01/2020)      │
└─────────────────────────────────────────────┘
```

**Components:**
- **Header:** Back button, avatar, name, contact info, action buttons
- **Tabs:** Profile, Donations, Attendance, Notes (for leaders)
- **Profile Tab:**
  - Sections with headers (Personal, Church, Departments, Fellowship)
  - Read-only display, click "Edit Profile" to modify
- **Donations Tab:**
  - Table of donations (date, amount, purpose)
  - Total giving summary
- **Attendance Tab:**
  - Calendar view or list of services attended
  - Attendance percentage

**Interactions:**
- Click "Edit Profile" → open edit modal or navigate to edit page
- Click department name → navigate to department page
- Click fellowship name → navigate to fellowship page

---

### 4. Soul Capture Form

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Capture New Soul                           │
│  [X Close]                                  │
├─────────────────────────────────────────────┤
│  Personal Information                       │
│  First Name: [____________]                 │
│  Last Name:  [____________]                 │
│  Phone:      [____________]                 │
│  Email:      [____________] (optional)      │
│                                             │
│  Source                                     │
│  ○ Outreach Program: [Select Program ▼]    │
│  ○ Ad-hoc Evangelism                        │
│                                             │
│  Location: [____________]                   │
│  Notes:    [____________]                   │
│            [____________]                   │
│                                             │
│  [Cancel] [Capture Soul]                    │
└─────────────────────────────────────────────┘
```

**Components:**
- **Modal:** Centered, overlay background
- **Form Fields:** Text inputs, radio buttons, dropdown, textarea
- **Validation:** Real-time validation, error messages below fields
- **Buttons:** Cancel (secondary), Capture Soul (primary, Purple 700)

**Interactions:**
- Required fields marked with red asterisk
- Phone field: Format validation (international format)
- Email field: Format validation (optional)
- Source: If "Outreach Program" selected, show dropdown
- On submit: Show loading spinner, then success message
- Success: "Soul captured! Assigned to you for follow-up"

---

### 5. Soul Follow-up Tracking (Kanban Board)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  My Souls                                   │
│  [+ Capture Soul] [Filter ▼]                │
├─────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ New  │ │Follow│ │Inter-│ │Conve-│      │
│  │  (5) │ │  Up  │ │ested │ │ rted │      │
│  │      │ │  (3) │ │  (2) │ │  (1) │      │
│  ├──────┤ ├──────┤ ├──────┤ ├──────┤      │
│  │┌────┐│ │┌────┐│ │┌────┐│ │┌────┐│      │
│  ││John││ ││Mary││ ││Paul││ ││Jane││      │
│  ││Doe ││ ││Jane││ ││Smith││ ││Doe ││      │
│  ││📞  ││ ││📞  ││ ││✓   ││ ││✓   ││      │
│  │└────┘│ │└────┘│ │└────┘│ │└────┘│      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
└─────────────────────────────────────────────┘
```

**Components:**
- **Kanban Columns:** New, Following Up, Interested, Converted
- **Soul Cards:**
  - Name (bold)
  - Phone number
  - Days since last follow-up (if > 2 days, show warning icon)
  - Quick action icons (Call, Log Follow-up)
- **Drag-and-Drop:** Move cards between columns to update status

**Interactions:**
- Click card → open soul detail modal
- Drag card → update status
- Click phone icon → open "Log Follow-up" modal
- Warning icon (red) if no follow-up in 2+ days

---

### 6. Donation Recording Form

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Record Donation                            │
│  Tabs: [Online] [Manual Entry]             │
├─────────────────────────────────────────────┤
│  Manual Entry Tab:                          │
│                                             │
│  Member: [Search member...] (optional)      │
│  Amount: [£ ____________]                   │
│  Purpose: ○ Offering ○ Tithe               │
│           ○ Building Fund ○ Other           │
│  If Other: [____________]                   │
│                                             │
│  Payment Method:                            │
│  ○ Cash ○ Check ○ Bank Transfer            │
│  ○ Mobile Money                             │
│                                             │
│  Date: [DD/MM/YYYY]                         │
│  Anonymous: ☐ Make this donation anonymous │
│                                             │
│  [Cancel] [Record Donation]                 │
└─────────────────────────────────────────────┘
```

**Components:**
- **Tabs:** Online (Stripe integration), Manual Entry
- **Member Search:** Autocomplete dropdown, optional (for walk-in donors)
- **Amount Input:** Currency symbol (£), number validation
- **Radio Buttons:** Purpose and payment method
- **Conditional Field:** "If Other" text input appears when "Other" selected
- **Date Picker:** Calendar widget
- **Checkbox:** Anonymous donation

**Interactions:**
- Member search: Type to filter, select from dropdown
- Amount: Only allow numbers and decimal point
- Purpose "Other": Show text input when selected
- On submit: Validate required fields, show success message
- Success: "Donation recorded. Receipt sent to member email"

---

### 7. Form Builder

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Form Builder                               │
│  Form Name: [____________]                  │
│  Scope: ○ Church-wide ○ Branch-specific    │
├──────────────┬──────────────────────────────┤
│ Field Types  │  Form Preview               │
│              │                              │
│ [Text]       │  Form Title                 │
│ [Email]      │  [Form Name]                │
│ [Phone]      │                              │
│ [Number]     │  Drag fields here...        │
│ [Date]       │                              │
│ [Dropdown]   │                              │
│ [Checkbox]   │                              │
│ [Radio]      │                              │
│ [Textarea]   │                              │
│              │                              │
│              │                              │
│              │  [Save Form] [Preview]      │
└──────────────┴──────────────────────────────┘
```

**Components:**
- **Left Panel:** Field type buttons (drag source)
- **Right Panel:** Form preview (drop target)
- **Field Configuration:** Click field to edit properties
  - Label, placeholder, required, validation rules

**Interactions:**
- Drag field type from left → drop in preview area
- Click field in preview → show configuration panel
- Reorder fields by dragging
- Delete field (trash icon)
- Preview form (opens in new tab)
- Save form → success message

**Field Configuration Panel:**
```
┌─────────────────────────────────────────────┐
│  Field Settings                             │
│  Type: Text Input                           │
│  Label: [____________]                      │
│  Placeholder: [____________]                │
│  ☑ Required                                 │
│  ☐ Auto-populate from member profile       │
│  [Delete Field] [Done]                      │
└─────────────────────────────────────────────┘
```

---

### 8. Attendance Recording

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Record Service Attendance                  │
│  Service Date: [DD/MM/YYYY]                 │
│  Service Type: [Sunday Service ▼]          │
│  Branch: [Main ▼]                           │
├─────────────────────────────────────────────┤
│  [Search members...] [Select All]           │
│  ☑ Mark all as Present                      │
├─────────────────────────────────────────────┤
│  ☑ John Doe          [Present ▼]           │
│  ☑ Mary Jane         [Present ▼]           │
│  ☐ Paul Smith        [Absent ▼]            │
│  ☑ Grace Lee         [Virtual ▼]           │
│  ...                                        │
├─────────────────────────────────────────────┤
│  Selected: 45 of 250 members                │
│  [Cancel] [Save Attendance]                 │
└─────────────────────────────────────────────┘
```

**Components:**
- **Date Picker:** Select service date
- **Dropdowns:** Service type, branch
- **Search Bar:** Filter members by name
- **Bulk Actions:** "Select All" checkbox, "Mark all as Present" checkbox
- **Member List:**
  - Checkbox (select for bulk action)
  - Name
  - Status dropdown (Present, Absent, Virtual)
- **Summary:** Count of selected members
- **Buttons:** Cancel, Save Attendance

**Interactions:**
- Search: Filter list in real-time
- Select All: Check all checkboxes
- Mark all as Present: Set all dropdowns to "Present"
- Individual dropdown: Change status per member
- Save: Validate (at least one member selected), show success message

---

### 9. Notification Center

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Notifications                              │
│  [Mark all as read]                         │
├─────────────────────────────────────────────┤
│  ● New soul assigned to you                │
│    Grace captured a soul. Follow up soon.  │
│    2 hours ago                              │
├─────────────────────────────────────────────┤
│  ○ Donation received                        │
│    John Doe donated £100 (Tithe)           │
│    5 hours ago                              │
├─────────────────────────────────────────────┤
│  ○ Member approved                          │
│    Mary Jane's registration was approved.  │
│    1 day ago                                │
├─────────────────────────────────────────────┤
│  [Load More]                                │
└─────────────────────────────────────────────┘
```

**Components:**
- **Header:** "Notifications" title, "Mark all as read" link
- **Notification Items:**
  - Unread indicator (filled circle, Purple 700)
  - Read indicator (empty circle, Gray 300)
  - Title (bold)
  - Message (regular)
  - Timestamp (Gray 500, small)
- **Load More:** Button to load older notifications

**Interactions:**
- Click notification → mark as read, navigate to relevant page
- Click "Mark all as read" → mark all as read
- Hover notification → highlight (Gray 50 background)

**Bell Icon Badge:**
- Show count of unread notifications
- Max display: 99+ (if > 99)
- Color: Burgundy 700 background, white text

---

### 10. Reports Dashboard

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Reports                                    │
│  [Date Range: Last 30 Days ▼] [Export CSV] │
├─────────────────────────────────────────────┤
│  Attendance Trends                          │
│  [Line chart: 8 weeks of attendance %]      │
├─────────────────────────────────────────────┤
│  Donation Summary                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Offering │ │  Tithe   │ │ Building │   │
│  │ £5,000   │ │ £6,000   │ │ £1,500   │   │
│  └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────┤
│  Soul Conversion Funnel                     │
│  New (15) → Following Up (10) →             │
│  Interested (5) → Converted (2)             │
└─────────────────────────────────────────────┘
```

**Components:**
- **Date Range Selector:** Dropdown (Last 7 days, Last 30 days, Last 90 days, Custom)
- **Export Button:** Download CSV of current view
- **Charts:**
  - Line chart (attendance trends)
  - Bar chart (donation breakdown)
  - Funnel chart (soul conversion)
- **Stat Cards:** Summary metrics

**Interactions:**
- Change date range → update all charts
- Hover chart → show tooltip with details
- Click "Export CSV" → download file

---

## Component Library

### Buttons

**Primary Button:**
```
Background: Purple 700
Text: White
Hover: Purple 500
Active: Purple 900
Disabled: Gray 300 background, Gray 500 text
Border Radius: 4px
Padding: 8px 16px (sm), 12px 24px (md), 16px 32px (lg)
Font: Semibold
```

**Secondary Button:**
```
Background: White
Text: Purple 700
Border: 1px solid Purple 700
Hover: Purple 100 background
Active: Purple 200 background
```

**Danger Button:**
```
Background: Burgundy 700
Text: White
Hover: Burgundy 500
Active: Burgundy 900
```

**Ghost Button:**
```
Background: Transparent
Text: Purple 700
Hover: Purple 100 background
```

**Icon Button:**
```
Square (32px, 40px, 48px)
Icon centered
Hover: Gray 100 background
```

### Form Inputs

**Text Input:**
```
Border: 1px solid Gray 300
Border Radius: 4px
Padding: 8px 12px
Font: Body (16px)
Focus: Purple 700 border, Purple 100 shadow
Error: Burgundy 700 border, Burgundy 100 background
Disabled: Gray 100 background, Gray 500 text
```

**Label:**
```
Font: Body Small (14px), Semibold
Color: Gray 700
Margin Bottom: 4px
Required indicator: Red asterisk
```

**Helper Text:**
```
Font: Caption (12px)
Color: Gray 500
Margin Top: 4px
```

**Error Message:**
```
Font: Caption (12px)
Color: Burgundy 700
Icon: Alert Circle (Lucide)
Margin Top: 4px
```

**Dropdown/Select:**
```
Same as Text Input
Chevron Down icon (right)
Dropdown menu: White background, shadow-lg
Options: Hover Gray 100, Selected Purple 100
```

**Checkbox:**
```
Size: 20px
Border: 2px solid Gray 300
Border Radius: 4px
Checked: Purple 700 background, white checkmark
Focus: Purple 700 border, Purple 100 shadow
```

**Radio Button:**
```
Size: 20px
Border: 2px solid Gray 300
Border Radius: Full (circle)
Selected: Purple 700 border, Purple 700 inner circle
```

**Textarea:**
```
Same as Text Input
Min Height: 80px
Resize: Vertical only
```

**Date Picker:**
```
Text Input + Calendar icon (right)
Calendar popup: White background, shadow-lg
Selected date: Purple 700 background
Today: Purple 100 background
```

### Cards

**Standard Card:**
```
Background: White
Border: 1px solid Gray 200
Border Radius: 8px
Padding: 16px (sm), 24px (md), 32px (lg)
Shadow: shadow-sm
Hover: shadow-md (if clickable)
```

**Stat Card:**
```
Same as Standard Card
Icon: Top left (32px, colored)
Label: Body Small, Gray 500
Value: Display (48px), Bold
Change Indicator: Body Small, Green (up) or Red (down)
```

### Tables

**Table:**
```
Background: White
Border: 1px solid Gray 200
Border Radius: 8px
```

**Table Header:**
```
Background: Gray 50
Border Bottom: 1px solid Gray 200
Padding: 12px 16px
Font: Body Small, Semibold, Gray 700
Sortable: Chevron icon (up/down)
```

**Table Row:**
```
Border Bottom: 1px solid Gray 100
Padding: 12px 16px
Hover: Gray 50 background
Selected: Purple 100 background
```

**Table Cell:**
```
Font: Body (16px), Gray 900
Vertical Align: Middle
```

**Actions Column:**
```
Three-dot menu icon
Dropdown: Edit, Delete, View
```

### Modals

**Modal Overlay:**
```
Background: rgba(0, 0, 0, 0.5)
Z-index: 1000
```

**Modal Container:**
```
Background: White
Border Radius: 12px
Shadow: shadow-xl
Max Width: 600px (sm), 800px (md), 1000px (lg)
Padding: 24px
```

**Modal Header:**
```
Font: H3 (24px), Semibold
Margin Bottom: 16px
Close button: Top right, X icon
```

**Modal Body:**
```
Font: Body (16px)
Max Height: 70vh
Overflow: Auto
```

**Modal Footer:**
```
Border Top: 1px solid Gray 200
Padding Top: 16px
Margin Top: 16px
Buttons: Right-aligned, Cancel (secondary) + Action (primary)
```

### Badges

**Status Badge:**
```
Border Radius: Full (pill)
Padding: 4px 12px
Font: Caption (12px), Semibold
```

**Badge Colors:**
```
Active: Gold 600 background, Gold 900 text
Inactive: Gray 300 background, Gray 700 text
Pending: Blue 600 background, Blue 900 text
Error: Burgundy 600 background, Burgundy 900 text
```

### Alerts

**Alert Box:**
```
Border Radius: 8px
Padding: 12px 16px
Border Left: 4px solid (color)
Icon: Left (20px)
```

**Alert Types:**
```
Success: Gold 100 background, Gold 900 text, Gold 600 border
Warning: Gold 100 background, Gold 900 text, Gold 400 border
Error: Burgundy 100 background, Burgundy 900 text, Burgundy 700 border
Info: Blue 100 background, Blue 900 text, Blue 700 border
```

### Tooltips

**Tooltip:**
```
Background: Gray 900
Text: White
Font: Caption (12px)
Padding: 4px 8px
Border Radius: 4px
Arrow: 4px triangle
Max Width: 200px
```

### Loading States

**Spinner:**
```
Size: 16px (sm), 24px (md), 32px (lg)
Color: Purple 700
Animation: Rotate 360deg, 1s linear infinite
```

**Skeleton Loader:**
```
Background: Gray 200
Animation: Pulse (shimmer effect)
Border Radius: Same as component
```

**Progress Bar:**
```
Height: 4px (sm), 8px (md)
Background: Gray 200
Fill: Purple 700
Border Radius: Full
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

Kairos must meet WCAG 2.1 Level AA standards. This section outlines specific requirements.

### 1. Perceivable

**Color Contrast:**
- Text contrast ratio: Minimum 4.5:1 for normal text, 3:1 for large text (18px+)
- UI component contrast: Minimum 3:1 for interactive elements
- Test all color combinations with contrast checker
- Never rely on color alone to convey information

**Color Contrast Validation:**
```
Purple 700 (#5D3FD3) on White (#FFFFFF): ~7.6:1 ✓ (recompute against Modern Sanctuary)
Blue 700 (#1D4ED8) on White (#FFFFFF): 8.59:1 ✓
Gold 600 (#f8b537) on White (#FFFFFF): ~1.9:1 ✗ — DO NOT use gold for body text on white; reserve for backgrounds, accents, and large-text only
Burgundy 700 (#B91C1C) on White (#FFFFFF): 7.07:1 ✓
Gray 700 (#374151) on White (#FFFFFF): 10.73:1 ✓
White (#FFFFFF) on Purple 700 (#5D3FD3): ~7.6:1 ✓
```

**Text Alternatives:**
- All images must have alt text
- Decorative images: `alt=""`
- Informative images: Descriptive alt text
- Icons: aria-label or sr-only text
- Charts: Provide data table alternative

**Audio/Video:**
- Captions for all video content (Phase 2 - if video added)
- Transcripts for audio content

### 2. Operable

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Tab order must be logical (top to bottom, left to right)
- Focus indicators must be visible (Gold #f8b537 — the "Gold Glow" — or Purple #5D3FD3 outline, 2px)
- Skip to main content link (hidden until focused)
- No keyboard traps

**Focus Management:**
```css
/* Focus styles */
*:focus {
  outline: 2px solid #5D3FD3; /* Purple — Modern Sanctuary */
  outline-offset: 2px;
}

/* Inputs lift to gold on focus per Modern Sanctuary "Gold Glow" rule */
input:focus, textarea:focus, select:focus {
  outline: 2px solid #f8b537; /* Gold */
  outline-offset: 0;
}

/* Skip to main content */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #5D3FD3;
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

**Keyboard Shortcuts:**
- No single-key shortcuts (avoid conflicts with screen readers)
- Document all keyboard shortcuts in help section
- Allow users to disable/customize shortcuts

**Time Limits:**
- No time limits on forms (or provide option to extend)
- Session timeout: 30 minutes, with warning at 25 minutes
- Allow users to extend session

**Seizures:**
- No flashing content (> 3 flashes per second)
- Avoid auto-playing animations

### 3. Understandable

**Language:**
- Set page language: `<html lang="en">`
- Use clear, simple language
- Avoid jargon where possible
- Define abbreviations on first use

**Predictable:**
- Consistent navigation across all pages
- Consistent component behavior
- No unexpected context changes
- Warn users before opening new windows/tabs

**Input Assistance:**
- Clear labels for all form fields
- Error messages must be specific and helpful
- Provide suggestions for fixing errors
- Confirm before destructive actions (delete, etc.)

**Error Handling:**
```
Bad: "Invalid input"
Good: "Email address must include @ symbol. Example: user@example.com"

Bad: "Error 400"
Good: "Phone number must be in format +44 7700 900000"
```

### 4. Robust

**HTML Semantics:**
- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<aside>`)
- Proper heading hierarchy (h1 → h2 → h3, no skipping)
- Use `<button>` for buttons, `<a>` for links
- Use `<label>` for form inputs

**ARIA Attributes:**
- Use ARIA landmarks: `role="navigation"`, `role="main"`, `role="complementary"`
- Use ARIA labels: `aria-label`, `aria-labelledby`, `aria-describedby`
- Use ARIA states: `aria-expanded`, `aria-selected`, `aria-checked`
- Use ARIA live regions: `aria-live="polite"` for notifications

**Example: Accessible Button**
```jsx
<button
  type="button"
  aria-label="Delete member John Doe"
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
  Delete
</button>
```

**Example: Accessible Form**
```jsx
<form>
  <label htmlFor="email">
    Email Address <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <p id="email-error" role="alert">
      Email address must include @ symbol
    </p>
  )}
</form>
```

**Example: Accessible Modal**
```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Member</h2>
  <p id="modal-description">
    Are you sure you want to delete John Doe? This action cannot be undone.
  </p>
  <button onClick={handleCancel}>Cancel</button>
  <button onClick={handleConfirm}>Delete</button>
</div>
```

### Screen Reader Testing

**Test with:**
- NVDA (Windows) - Free
- JAWS (Windows) - Paid
- VoiceOver (macOS/iOS) - Built-in
- TalkBack (Android) - Built-in

**Testing Checklist:**
- [ ] All interactive elements are announced
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Page title changes on navigation
- [ ] Focus moves logically through page
- [ ] Modals trap focus correctly
- [ ] Notifications are announced (aria-live)

### Accessibility Tools

**Development:**
- axe DevTools (browser extension)
- Lighthouse (Chrome DevTools)
- WAVE (browser extension)
- React Axe (development mode)

**Testing:**
- Pa11y (automated testing)
- Axe-core (CI/CD integration)
- Manual keyboard testing
- Manual screen reader testing

### Accessibility Statement

Include an accessibility statement page:
```
Kairos is committed to ensuring digital accessibility for people with disabilities. 
We are continually improving the user experience for everyone and applying the 
relevant accessibility standards.

Conformance Status:
Kairos conforms to WCAG 2.1 Level AA.

Feedback:
We welcome your feedback on the accessibility of Kairos. Please contact us at 
accessibility@kairos.church

Assessment:
This website was last assessed on [date] using [tools].
```

---

## Responsive Design

### Breakpoints

```
Mobile: 0-639px (sm)
Tablet: 640-1023px (md)
Desktop: 1024-1279px (lg)
Large Desktop: 1280px+ (xl)
```

### Layout Adaptations

**Mobile (< 640px):**
- Sidebar: Hidden by default, hamburger menu
- Top bar: Compact, hide branch selector
- Tables: Horizontal scroll or card view
- Forms: Single column
- Modals: Full screen
- Stat cards: 1 column, stacked

**Tablet (640-1023px):**
- Sidebar: Collapsible, icon-only by default
- Top bar: Full features
- Tables: Horizontal scroll
- Forms: Single column
- Modals: Centered, max-width 600px
- Stat cards: 2 columns

**Desktop (1024px+):**
- Sidebar: Expanded by default
- Top bar: Full features
- Tables: Full width, all columns visible
- Forms: 2 columns where appropriate
- Modals: Centered, max-width 800px
- Stat cards: 3-4 columns

### Touch Targets

**Minimum Size:** 44x44px (WCAG 2.1 AA)
- Buttons: 44px height minimum
- Links: 44px height minimum (add padding if needed)
- Form inputs: 44px height minimum
- Checkboxes/radios: 20px size, but 44px touch area (padding)

### Mobile Interactions

**Gestures:**
- Swipe: Navigate between tabs (optional)
- Pull to refresh: Reload data (optional)
- Long press: Show context menu (optional)

**Mobile-Specific:**
- Use native date/time pickers
- Use native select dropdowns
- Optimize for thumb reach (bottom navigation)
- Avoid hover-only interactions

### Performance

**Mobile Performance Targets:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

**Optimization:**
- Lazy load images
- Code splitting (Next.js automatic)
- Compress images (WebP format)
- Minimize JavaScript bundle size
- Use CDN for static assets (CloudFront)

---

## Design Tokens

### Spacing Tokens

```typescript
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};
```

### Color Tokens

```typescript
export const colors = {
  primary: {
    900: '#4C1D95',
    700: '#5D3FD3', // Modern Sanctuary primary
    500: '#8B5CF6',
    100: '#EDE9FE',
  },
  secondary: {
    900: '#1E3A8A',
    700: '#1D4ED8',
    500: '#3B82F6',
    100: '#DBEAFE',
  },
  accent: {
    900: '#78350F',
    600: '#f8b537', // Modern Sanctuary gold
    400: '#FBBF24',
    100: '#FEF3C7',
  },
  alert: {
    900: '#7F1D1D',
    700: '#B91C1C',
    500: '#EF4444',
    100: '#FEE2E2',
  },
  gray: {
    900: '#111827',
    700: '#374151',
    500: '#6B7280',
    300: '#D1D5DB',
    100: '#F3F4F6',
    50: '#F9FAFB',
  },
  white: '#FFFFFF',
};
```

### Typography Tokens

```typescript
export const typography = {
  fontFamily: {
    sans: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  fontSize: {
    display: '3rem',      // 48px
    h1: '2.25rem',        // 36px
    h2: '1.875rem',       // 30px
    h3: '1.5rem',         // 24px
    h4: '1.25rem',        // 20px
    bodyLarge: '1.125rem', // 18px
    body: '1rem',         // 16px
    bodySmall: '0.875rem', // 14px
    caption: '0.75rem',   // 12px
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

### Shadow Tokens

```typescript
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
};
```

### Border Radius Tokens

```typescript
export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  full: '9999px',  // Pill/circle
};
```

---

## Implementation Guidelines

### Shadcn/ui Setup

**Installation:**
```bash
npx shadcn-ui@latest init
```

**Configuration:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        alert: colors.alert,
      },
    },
  },
};
```

**Component Usage:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

### Component Customization

**Example: Custom Button**
```tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PrimaryButton({ children, className, ...props }) {
  return (
    <Button
      className={cn(
        'bg-purple-700 hover:bg-purple-500 text-white',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### Dark Mode (Phase 2)

While not required for MVP, design system should support dark mode:

```typescript
export const darkColors = {
  primary: {
    900: '#EDE9FE',
    700: '#8B5CF6',
    500: '#5D3FD3', // Modern Sanctuary primary
    100: '#4C1D95',
  },
  // ... other colors inverted
};
```

---

## Design Checklist

### Before Development
- [ ] Design system tokens defined
- [ ] Color palette validated for contrast
- [ ] Typography scale established
- [ ] Component library selected (Shadcn/ui)
- [ ] Accessibility requirements documented

### During Development
- [ ] Use semantic HTML
- [ ] Add ARIA attributes where needed
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Validate color contrast
- [ ] Test on mobile devices
- [ ] Test on different browsers

### Before Launch
- [ ] Run automated accessibility tests (axe, Lighthouse)
- [ ] Manual keyboard testing
- [ ] Manual screen reader testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Performance testing (Lighthouse)
- [ ] Responsive design testing (all breakpoints)

---

## Appendix

### Design Resources

**Figma Files:**
- Design system library
- Component library
- Screen mockups
- User flow diagrams

**Assets:**
- Logo files (SVG, PNG)
- Icon set (Lucide React)
- Brand guidelines

**Documentation:**
- Component storybook
- Accessibility guidelines
- Design patterns

### Design Tools

**Design:**
- Figma (UI design)
- FigJam (user flows)

**Prototyping:**
- Figma prototypes
- Storybook (component library)

**Testing:**
- Chromatic (visual regression)
- Percy (visual testing)

**Accessibility:**
- Stark (Figma plugin)
- axe DevTools
- WAVE

---

## Document Metadata

**Version:** 1.0  
**Date:** February 3, 2026  
**Status:** Draft - Pending Review  
**Authors:** Design Team  

**Change Log:**
- 2026-02-03: Initial design requirements document created

**Next Steps:**
1. Review and approve design requirements
2. Create Figma design system
3. Create high-fidelity mockups
4. Begin frontend development (Week 1)

---

*This design document defines the visual and interaction design for Kairos. All UI implementation should follow these guidelines to ensure consistency and accessibility.*
