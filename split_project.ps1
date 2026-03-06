$ErrorActionPreference = "Continue"

$source = "d:\Testing Hub\React_Node_CRM"
$targetBase = "d:\Testing Hub\React_Node_CRM\Project_Versions"

Write-Host "Creating target directories in $targetBase"
if (Test-Path $targetBase) { Remove-Item -Recurse -Force $targetBase }
New-Item -ItemType Directory -Force -Path "$targetBase\cPanel_Version" | Out-Null
New-Item -ItemType Directory -Force -Path "$targetBase\Git_Version" | Out-Null
New-Item -ItemType Directory -Force -Path "$targetBase\Localhost_Version" | Out-Null

# --- 1. Localhost Version ---
Write-Host "Creating Localhost Version..."
robocopy "$source" "$targetBase\Localhost_Version" /E /XD backend_deploy .git Project_Versions /XF *.zip
if ($LASTEXITCODE -ge 8) { throw "Robocopy Localhost failed" }

# --- 2. Git Version ---
Write-Host "Creating Git Version..."
robocopy "$source" "$targetBase\Git_Version" /E /XD node_modules dist backend_deploy .git Project_Versions /XF *.zip .env
if ($LASTEXITCODE -ge 8) { throw "Robocopy Git failed" }

Push-Location "$targetBase\Git_Version"
git init
git add .
git commit -m "Initial commit for Git version"
Pop-Location

# --- 3. cPanel Version ---
Write-Host "Creating cPanel Version..."
$cpanelFrontend = "$targetBase\cPanel_Version\frontend_public_html"
$cpanelBackend = "$targetBase\cPanel_Version\backend_nodejs_app"

New-Item -ItemType Directory -Force -Path $cpanelFrontend | Out-Null
New-Item -ItemType Directory -Force -Path $cpanelBackend | Out-Null

if (Test-Path "$source\frontend_dist_deploy.zip") {
    Expand-Archive -Path "$source\frontend_dist_deploy.zip" -DestinationPath $cpanelFrontend -Force
}
else {
    Write-Host "Warning: frontend_dist_deploy.zip not found."
}

if (Test-Path "$source\backend_deploy") {
    robocopy "$source\backend_deploy" "$cpanelBackend" /E
    if ($LASTEXITCODE -ge 8) { throw "Robocopy cPanel backend failed" }
}
else {
    Write-Host "Warning: backend_deploy folder not found."
}

Write-Host "All versions separated successfully!"
