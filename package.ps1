<#
.SYNOPSIS
    Packages the Markdown Paste Thunderbird extension into a .xpi file
    ready for permanent installation or submission to
    addons.thunderbird.net.

.DESCRIPTION
    Zips the contents of this directory (excluding development-only files)
    with manifest.json at the root of the archive, then renames it to
    markdown-paste.xpi in the project root.
#>

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$outputXpi = Join-Path $root "markdown-paste.xpi"
$tempZip = Join-Path $root "markdown-paste.zip"

# Files/folders that must NOT be included in the packaged add-on.
$exclude = @(
    ".testprofile",
    ".git",
    ".gitignore",
    "node_modules",
    "package.ps1",
    "package.json",
    "package-lock.json",
    "tests",
    "markdown-paste.xpi",
    "markdown-paste.zip",
    "markdown-paste-source.zip"
)

Remove-Item $outputXpi -ErrorAction SilentlyContinue
Remove-Item $tempZip -ErrorAction SilentlyContinue

$items = Get-ChildItem -Path $root -Force | Where-Object { $exclude -notcontains $_.Name }

Compress-Archive -Path ($items.FullName) -DestinationPath $tempZip -CompressionLevel Optimal
Rename-Item -Path $tempZip -NewName (Split-Path $outputXpi -Leaf)

Write-Host "Packaged: $outputXpi"
Write-Host "Size: $((Get-Item $outputXpi).Length) bytes"
