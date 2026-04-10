# Participant Count & Scroll-to-Section Feature

## Summary
Added participant count display for leaders/pastors/admin in the outreach programs list, with clickable counts that scroll to and highlight the registration section in the detail page using Kairos theme styling.

## Changes Made

### Backend Changes

1. **Service Update** (`apps/api/src/outreach/service.ts`)
   - Modified `listPrograms` to return different data based on user role:
     - **Members**: Get `isRegistered` boolean (existing functionality)
     - **Leaders/Pastors/Admin**: Get `participantCount` number (new functionality)
   - Added efficient batch query to count participants for all programs
   - Uses `groupBy` to aggregate counts in a single query
   - Returns 0 if no participants registered

### Frontend Changes

2. **Programs List Page** (`apps/web/src/app/(dashboard)/outreach/programs/page.tsx`)
   - Added "Registered" column for non-members showing participant count
   - Participant count displayed as clickable button with:
     - Purple theme styling (`bg-purple-50`, `hover:bg-purple-100`, `text-purple-700`)
     - Users icon
     - Bold font for emphasis
     - Smooth hover transition
   - Clicking the count navigates to detail page with `?scrollTo=participants` query param
   - Updated `handleViewProgram` to accept optional `scrollTo` parameter
   - Table layout adjusted to accommodate new column

3. **Program Detail Page** (`apps/web/src/app/(dashboard)/outreach/programs/[id]/page.tsx`)
   - Added `useSearchParams` to read scroll-to query parameter
   - Added `highlightSection` state for animation control
   - Scroll-to functionality:
     - Smooth scrolls to participants section when query param present
     - Centers the section in viewport
     - 300ms delay to ensure content is loaded
   - Highlight animation:
     - 2-second purple ring pulse effect
     - Purple background tint
     - Smooth transition (500ms duration)
     - Auto-removes after animation completes
   - Enhanced participants section styling:
     - **Registered Workers Card**:
       - Purple gradient header (`from-purple-50`)
       - Purple icon and title
       - Emerald-themed list items (success color)
       - Checkmark icons for registered members
       - Hover effects on each item
     - **Not Registered Card**:
       - Amber gradient header (`from-amber-50`)
       - Amber icon and title
       - Amber-themed list items (warning color)
       - "Not Registered" badges
       - Hover effects on each item
   - Professional spacing and typography throughout

## Kairos Theme Integration

### Color Palette Used
- **Primary Purple** (#6D28D9): Highlight ring, button background, headers
- **Accent Gold/Amber** (#D97706): Not registered section
- **Success Emerald** (#059669): Registered members
- **Subtle backgrounds**: 50-opacity variants for soft visual hierarchy

### Design Elements
- Gradient headers for visual interest
- Icon integration (Users, CheckCircle2)
- Smooth transitions and hover states
- Professional spacing (p-3, gap-2)
- Border styling with theme colors
- Badge components with custom colors

## User Experience

### For Leaders/Pastors/Admin

**Before:**
1. View programs list
2. No indication of registration status
3. Must click "View" to see who registered
4. Scroll to find participants section

**After:**
1. View programs list
2. See participant count at a glance (e.g., "👥 5")
3. Click the count to jump directly to registration details
4. Section highlights with purple animation
5. Clear visual distinction between registered and unregistered members

### Visual Flow
1. **List View**: Purple button with count catches attention
2. **Click**: Smooth navigation with query parameter
3. **Detail View**: Automatic scroll to participants section
4. **Highlight**: 2-second purple pulse draws eye to section
5. **Content**: Color-coded cards (emerald = registered, amber = not registered)

## Performance

- Single additional query for participant counts (batch operation)
- Uses `groupBy` for efficient aggregation
- No N+1 query problem
- Members unaffected (no additional queries for them)

## Testing Recommendations

Manual testing scenarios:
1. Login as leader/pastor and view programs list
2. Verify participant count shows correctly
3. Click on participant count button
4. Verify smooth scroll to participants section
5. Verify purple highlight animation plays
6. Verify highlight disappears after 2 seconds
7. Verify registered members show in emerald-themed card
8. Verify unregistered members show in amber-themed card
9. Test with programs that have 0, 1, and multiple participants
10. Verify members still see their registration status (not participant count)
