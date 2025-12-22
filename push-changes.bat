@echo off
echo Starting git operations...
cd /d "C:\Users\acer\projecttechkharis\kairos"
echo Current directory: %CD%

echo Adding all changes...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo Error adding files
    pause
    exit /b 1
)

echo Committing changes...
git commit -m "feat: Complete API backend with demo services - Members, Departments, Events fully functional with CRUD operations, filtering, pagination, and statistics. API running on localhost:3333"
if %ERRORLEVEL% NEQ 0 (
    echo Error committing changes
    pause
    exit /b 1
)

echo Pushing to origin ruth...
git push origin ruth
if %ERRORLEVEL% NEQ 0 (
    echo Error pushing to remote
    pause
    exit /b 1
)

echo Successfully pushed all changes!
echo API backend with demo services pushed to remote repository
pause