# RAG Status System - Implementation Complete

## Overview
Implemented a comprehensive Red/Amber/Green (RAG) status system for both souls and follow-up records to provide visual indicators of urgency and quality.

---

## 1. Soul RAG Status (Pipeline View)

### Purpose
Indicates urgency of follow-up action needed for each soul based on timing.

### Visual Indicators
- **Colored left border** on soul cards (red/amber/green)
- **Status badge** in top-right corner (Critical/Monitor/All Good)

### RAG Rules

#### 🔴 RED - Critical (Intervention Required)
**Triggers:**
- No follow-up logged yet
- **New/Following Up** status: ≥3 days since last contact
- **Interested** status: ≥5 days since last contact

**Action:** Immediate follow-up required

#### 🟡 AMBER - Monitor (Monitoring Required)
**Triggers:**
- **New/Following Up** status: 2 days since last contact
- **Interested** status: 3-4 days since last contact

**Action:** Schedule follow-up soon

#### 🟢 GREEN - All Good
**Triggers:**
- **New/Following Up** status: <2 days since last contact
- **Interested** status: <3 days since last contact
- **Converted/Not Interested/Lost Contact**: No follow-up needed

**Action:** Continue normal monitoring

### Example
```
Soul: Peter Brown
Status: Following Up
Last Contact: 4 days ago
RAG: 🔴 RED (Critical) - Border is red, badge says "Critical"
```

---

## 2. Follow-up RAG Status (Detail View)

### Purpose
Indicates quality/outcome of each follow-up interaction.

### Visual Indicators
- **Colored left border** on follow-up records (red/amber/green)
- **RAG badge** showing status (Critical/Monitor/All Good)
- **Contact status badge** showing outcome

### RAG Rules

#### 🔴 RED - Critical
**Triggers:**
- Contact Status: **Wrong Number**
- Contact Status: **Declined**

**Meaning:** Serious issue - soul may be lost or contact info incorrect

#### 🟡 AMBER - Monitor
**Triggers:**
- Contact Status: **No Answer**
- Contact Status: **Busy**

**Meaning:** Unsuccessful attempt - retry needed

#### 🟢 GREEN - All Good
**Triggers:**
- Contact Status: **Successful**

**Meaning:** Productive conversation - follow-up went well

### Example
```
Follow-up Record:
Contact Method: Phone Call
Contact Status: Successful
RAG: 🟢 GREEN (All Good) - Border is green, badge says "All Good"
```

---

## Access by Role

### Member (e.g., Emma Thompson)
**Soul RAG:**
- ✅ Sees RAG status for assigned souls only
- ✅ Peter Brown with RED/AMBER/GREEN indicator

**Follow-up RAG:**
- ✅ Sees RAG status for follow-ups on assigned souls
- ✅ Can log follow-ups (which get RAG status automatically)

### Leader (e.g., Sarah Williams - London)
**Soul RAG:**
- ✅ Sees RAG status for all London souls
- ✅ John Davies, Mary Wilson, Peter Brown with indicators

**Follow-up RAG:**
- ✅ Sees RAG status for all follow-ups on London souls
- ✅ Can view collaboration notes with RAG indicators

### Pastor (e.g., James Okonkwo - London)
**Soul RAG:**
- ✅ Sees RAG status for all London souls (same as Leader)

**Follow-up RAG:**
- ✅ Sees RAG status for all follow-ups on London souls

### Admin
**Soul RAG:**
- ✅ Sees RAG status for ALL souls from ALL branches

**Follow-up RAG:**
- ✅ Sees RAG status for ALL follow-ups system-wide

---

## Implementation Details

### Soul RAG Calculation
```typescript
// Location: apps/web/src/app/(dashboard)/souls/page.tsx
const getRAGStatus = (status: string, daysSinceLastFollowUp: number | null) => {
  // Converted/Not Interested/Lost Contact = GREEN
  if (status === 'Converted' || status === 'Not Interested' || status === 'Lost Contact') {
    return GREEN;
  }
  
  // No follow-up = RED
  if (daysSinceLastFollowUp === null) {
    return RED;
  }
  
  // New/Following Up: RED ≥3, AMBER 2, GREEN <2
  if (status === 'New' || status === 'Following Up') {
    if (daysSinceLastFollowUp >= 3) return RED;
    if (daysSinceLastFollowUp >= 2) return AMBER;
    return GREEN;
  }
  
  // Interested: RED ≥5, AMBER 3-4, GREEN <3
  if (status === 'Interested') {
    if (daysSinceLastFollowUp >= 5) return RED;
    if (daysSinceLastFollowUp >= 3) return AMBER;
    return GREEN;
  }
}
```

### Follow-up RAG Calculation
```typescript
// Location: apps/web/src/app/(dashboard)/souls/[id]/page.tsx
const getFollowUpRAG = (contactStatus: string) => {
  if (contactStatus === 'Successful') return GREEN;
  if (contactStatus === 'No Answer' || contactStatus === 'Busy') return AMBER;
  if (contactStatus === 'Wrong Number' || contactStatus === 'Declined') return RED;
  return AMBER; // Default
}
```

---

## Benefits

### For Workers
- **Quick visual scan** of which souls need urgent attention
- **Prioritize follow-ups** based on RED/AMBER/GREEN indicators
- **Track follow-up quality** with outcome-based RAG status

### For Leaders/Pastors
- **Monitor team performance** by viewing follow-up RAG patterns
- **Identify struggling souls** with persistent RED status
- **Allocate resources** to critical cases

### For Admin
- **System-wide visibility** of follow-up health
- **Identify branches** needing support (many RED souls)
- **Track conversion pipeline** effectiveness

---

## Color Scheme

### Tailwind Classes Used
```typescript
RED (Critical):
- Border: border-l-rose-500
- Background: bg-rose-100
- Text: text-rose-700

AMBER (Monitor):
- Border: border-l-amber-500
- Background: bg-amber-100
- Text: text-amber-700

GREEN (All Good):
- Border: border-l-emerald-500
- Background: bg-emerald-100
- Text: text-emerald-700
```

---

## Testing

### Test Soul RAG Status
1. Login as Leader (sarah.williams@kairos.local)
2. Navigate to `/souls`
3. Observe colored borders and badges on soul cards
4. Verify RED for souls with no follow-up or overdue
5. Verify AMBER for souls due soon
6. Verify GREEN for souls on track

### Test Follow-up RAG Status
1. Login as Leader
2. Click on a soul (e.g., Peter Brown)
3. View follow-up history
4. Observe colored borders on follow-up records
5. Log new follow-up with "Successful" → Should show GREEN
6. Log new follow-up with "No Answer" → Should show AMBER
7. Log new follow-up with "Declined" → Should show RED

---

## Files Modified

- `apps/web/src/app/(dashboard)/souls/page.tsx` - Soul RAG status
- `apps/web/src/app/(dashboard)/souls/[id]/page.tsx` - Follow-up RAG status

---

## Conclusion

✅ Soul RAG status implemented (timing-based)
✅ Follow-up RAG status implemented (outcome-based)
✅ Visual indicators with colored borders and badges
✅ Role-based access maintained
✅ Branch isolation respected
✅ Automatic calculation (no manual input needed)

The RAG system provides instant visual feedback on follow-up urgency and quality!
