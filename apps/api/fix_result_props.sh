#!/bin/bash
SRC="/Users/kalvertabbey/Library/CloudStorage/OneDrive-Personal/Documents/kairos/apps/api/src"

# Fix result object property accesses (dot notation on returned rows)
# These are NOT table schema references - they're variable.property accesses
find "$SRC" -type f -name "*.ts" -exec sed -i '' \
  -e 's/\.\(leadershipId\)\b/.id/g' \
  -e 's/\.\(departmentMemberId\)\b/.id/g' \
  -e 's/\.\(soulId\)\b/.id/g' \
  -e 's/\.\(donationId\)\b/.id/g' \
  -e 's/\.\(fellowshipMemberId\)\b/.id/g' \
  -e 's/\.\(submissionId\)\b/.id/g' \
  -e 's/\.\(followUpId\)\b/.id/g' \
  -e 's/\.\(formId\)\b/.id/g' \
  -e 's/\.\(branchDepartmentId\)\b/.id/g' \
  -e 's/\.\(memberId\)\b/.id/g' \
  {} +

echo "Done result property renames"
