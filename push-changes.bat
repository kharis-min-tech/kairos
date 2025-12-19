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
git commit -m "feat: Complete Task 16 - Final validation and testing suite with all applications running - API:3333 WebAdmin:4200 MemberApp:4201"
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
echo Task 16 completion pushed to remote repository
pause