# Follow-up Status Update Feature

## Summary
Added two key improvements to the follow-up system:
1. Optional status update when logging a follow-up
2. Custom contact method input when "Other" is selected

## Changes Made

### Backend Changes

1. **Schema Update** (`apps/api/src/outreach/schemas.ts`)
   - Added optional `updateStatus` field to `logFollowUpSchema`
   - Changed `contactMethod` from enum to string (max 100 chars) to allow custom methods
   - Accepts any valid soul status: 'New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'

2. **Service Update** (`apps/api/src/outreach/follow-ups-service.ts`)
   - Modified `logFollowUp` function to accept optional `updateStatus` parameter
   - Fetches current soul status to compare
   - Updates soul status only if provided and different from current status
   - Maintains all existing access control rules:
     - Members can only log follow-ups for souls assigned to them
     - Pastors/Leaders/Admin have broader access based on branch isolation

### Frontend Changes

3. **Soul Detail Page** (`apps/web/src/app/(dashboard)/souls/[id]/page.tsx`)
   - Added `updateStatus` field to follow-up form state
   - Added `contactMethodOther` field to follow-up form state
   - Added new dropdown in follow-up form UI showing:
     - Current status as default option
     - All available status options
     - Helper text explaining the optional nature
   - Added conditional text input for custom contact method:
     - Appears when "Other" is selected from contact method dropdown
     - Required field when "Other" is selected
     - Placeholder text: "Specify contact method..."
   - Form submission logic:
     - Uses custom contact method text if "Other" is selected
     - Falls back to dropdown value for standard methods
     - Includes the optional status update
   - Form reset clears all fields including custom contact method

## Access Control Maintained

All existing access control rules are preserved:

- **Members**: Can only log follow-ups (and update status) for souls assigned to them
- **Leaders**: Can log follow-ups for souls in their branch
- **Pastors**: Can log follow-ups for souls in their branch
- **Admin**: Can log follow-ups for any soul

## User Experience

### Before
1. User logs a follow-up with contact details (limited to predefined methods)
2. User separately updates soul status via dropdown at top of page
3. Two separate actions, potential for forgetting to update status
4. No way to specify custom contact methods

### After
1. User logs a follow-up with contact details
2. If contact method is "Other", user can specify custom method (e.g., "Facebook Messenger", "Home Visit", "Letter")
3. User optionally selects new status in the same form
4. Single action updates both follow-up history and soul status
5. Status update is optional - can keep current status if desired

## Contact Method Options

**Standard Options:**
- Phone Call
- Text Message
- WhatsApp
- In Person
- Email
- Other (triggers custom input field)

**Custom Methods:**
When "Other" is selected, users can enter any contact method up to 100 characters, such as:
- Facebook Messenger
- Instagram DM
- Home Visit
- Letter/Mail
- Video Call
- Church Event
- Community Gathering
- etc.

## Timeline Display

The timeline now properly reflects:
- Status changes that occur during follow-ups
- Custom contact methods in follow-up history
- All contact methods are stored and displayed as entered

## Testing

No automated tests exist for follow-ups yet. Manual testing recommended:
- Log follow-up without status change
- Log follow-up with status change
- Log follow-up with "Other" contact method and custom text
- Verify custom contact method appears in follow-up history
- Verify access control for different roles
- Verify timeline shows status changes correctly
- Verify validation requires custom text when "Other" is selected
