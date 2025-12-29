Write-Host "Adding all changes..."
git add .

Write-Host "Committing changes..."
git commit -m "feat: Complete API backend with demo services - Members, Departments, Events fully functional with CRUD operations, filtering, pagination, and statistics. API running on localhost:3333"

Write-Host "Pushing to origin ruth..."
git push origin ruth

Write-Host "Successfully pushed all changes!"