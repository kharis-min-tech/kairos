#!/bin/bash
SRC="/Users/kalvertabbey/Library/CloudStorage/OneDrive-Personal/Documents/kairos/apps/api/src"
find "$SRC" -type f -name "*.ts" -exec sed -i '' \
  -e 's/outreachPrograms\.outreachId/outreachPrograms.id/g' \
  -e 's/souls\.soulId/souls.id/g' \
  -e 's/branchDepartments\.branchDepartmentId/branchDepartments.id/g' \
  -e 's/departmentMembers\.departmentMemberId/departmentMembers.id/g' \
  -e 's/forms\.formId/forms.id/g' \
  -e 's/donations\.donationId/donations.id/g' \
  -e 's/formSubmissions\.submissionId/formSubmissions.id/g' \
  -e 's/fellowshipMembers\.fellowshipMemberId/fellowshipMembers.id/g' \
  -e 's/followUps\.followUpId/followUps.id/g' \
  -e 's/regions\.regionId/regions.id/g' \
  -e 's/branches\.branchId/branches.id/g' \
  {} +
echo "Done entity ID renames"
