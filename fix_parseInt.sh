#!/bin/bash

# Fix all parseInt(event.pathParameters) to just get the string value

cd /Users/kalvertabbey/Library/CloudStorage/OneDrive-Personal/Documents/kairos/apps/api/src

# Fix members-approve.ts
sed -i '' 's/const targetMemberId = parseInt(event.pathParameters?.memberId || '"'"''"'"', 10);/const targetMemberId = event.pathParameters?.memberId || '"'"''"'"';/' members/members-approve.ts
sed -i '' 's/if (isNaN(targetMemberId))/if (!targetMemberId)/' members/members-approve.ts

# Fix members-update.ts
sed -i '' 's/const targetMemberId = parseInt(event.pathParameters?.memberId || '"'"''"'"', 10);/const targetMemberId = event.pathParameters?.memberId || '"'"''"'"';/' members/members-update.ts
sed -i '' 's/if (isNaN(targetMemberId))/if (!targetMemberId)/' members/members-update.ts

# Fix members-get.ts
sed -i '' 's/const targetMemberId = parseInt(event.pathParameters?.memberId || '"'"''"'"', 10);/const targetMemberId = event.pathParameters?.memberId || '"'"''"'"';/' members/members-get.ts
sed -i '' 's/if (isNaN(targetMemberId))/if (!targetMemberId)/' members/members-get.ts

# Fix members-delete.ts
sed -i '' 's/const targetMemberId = parseInt(event.pathParameters?.memberId || '"'"''"'"', 10);/const targetMemberId = event.pathParameters?.memberId || '"'"''"'"';/' members/members-delete.ts
sed -i '' 's/if (isNaN(targetMemberId))/if (!targetMemberId)/' members/members-delete.ts

# Fix fellowships-update.ts
sed -i '' 's/const fellowshipId = parseInt(event.pathParameters?.fellowshipId || '"'"''"'"', 10);/const fellowshipId = event.pathParameters?.fellowshipId || '"'"''"'"';/' fellowships/fellowships-update.ts
sed -i '' 's/if (isNaN(fellowshipId))/if (!fellowshipId)/' fellowships/fellowships-update.ts

# Fix fellowships-get-meeting.ts
sed -i '' 's/const meetingId = parseInt(event.pathParameters?.meetingId || '"'"''"'"', 10);/const meetingId = event.pathParameters?.meetingId || '"'"''"'"';/' fellowships/fellowships-get-meeting.ts
sed -i '' 's/if (isNaN(meetingId))/if (!meetingId)/' fellowships/fellowships-get-meeting.ts

# Fix souls-get.ts
sed -i '' 's/const soulId = parseInt(event.pathParameters?.soulId || '"'"''"'"', 10);/const soulId = event.pathParameters?.soulId || '"'"''"'"';/' outreach/souls-get.ts
sed -i '' 's/if (isNaN(soulId))/if (!soulId)/' outreach/souls-get.ts

# Fix souls-update-status.ts
sed -i '' 's/const soulId = parseInt(event.pathParameters?.soulId || '"'"''"'"', 10);/const soulId = event.pathParameters?.soulId || '"'"''"'"';/' outreach/souls-update-status.ts
sed -i '' 's/if (isNaN(soulId))/if (!soulId)/' outreach/souls-update-status.ts

# Fix outreach-complete-program.ts
sed -i '' 's/const outreachId = parseInt(event.pathParameters?.outreachId || '"'"''"'"', 10);/const outreachId = event.pathParameters?.outreachId || '"'"''"'"';/' outreach/outreach-complete-program.ts
sed -i '' 's/if (isNaN(outreachId))/if (!outreachId)/' outreach/outreach-complete-program.ts

# Fix outreach-get-program.ts
sed -i '' 's/const outreachId = parseInt(event.pathParameters?.outreachId || '"'"''"'"', 10);/const outreachId = event.pathParameters?.outreachId || '"'"''"'"';/' outreach/outreach-get-program.ts
sed -i '' 's/if (isNaN(outreachId))/if (!outreachId)/' outreach/outreach-get-program.ts

# Fix forms-save-template.ts
sed -i '' 's/const formId = parseInt(event.pathParameters?.formId || '"'"''"'"', 10);/const formId = event.pathParameters?.formId || '"'"''"'"';/' forms/forms-save-template.ts
sed -i '' 's/if (isNaN(formId))/if (!formId)/' forms/forms-save-template.ts

# Fix forms-create-from-template.ts
sed -i '' 's/const templateId = parseInt(event.pathParameters?.templateId || '"'"''"'"', 10);/const templateId = event.pathParameters?.templateId || '"'"''"'"';/' forms/forms-create-from-template.ts
sed -i '' 's/if (isNaN(templateId))/if (!templateId)/' forms/forms-create-from-template.ts

# Fix forms-get.ts
sed -i '' 's/const formId = parseInt(event.pathParameters?.formId || '"'"''"'"', 10);/const formId = event.pathParameters?.formId || '"'"''"'"';/' forms/forms-get.ts
sed -i '' 's/if (isNaN(formId))/if (!formId)/' forms/forms-get.ts

# Fix donations-get-member-summary.ts
sed -i '' 's/const memberId = parseInt(event.pathParameters?.memberId || '"'"''"'"', 10);/const memberId = event.pathParameters?.memberId || '"'"''"'"';/' donations/donations-get-member-summary.ts
sed -i '' 's/if (isNaN(memberId))/if (!memberId)/' donations/donations-get-member-summary.ts

echo "Fixed all parseInt(event.pathParameters) patterns"
