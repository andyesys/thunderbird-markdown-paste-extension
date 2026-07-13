# Build Instructions

This document describes exactly how to reproduce `markdown-paste.xpi` from
this repository's source, as required by addons.thunderbird.net's source
code submission policy.

**Note on this add-on's source**: `manifest.json`, `background.js`,
`composescript.js`, and `composestyles.css` are the literal, hand-written
source of this add-on — they are **not** minified, transpiled, bundled, or
otherwise machine-generated. There is no compilation/transpilation step for
this add-on's own code; `.\package.ps1` only *packages* (zips) the existing
source files, it does not transform them. The only machine-generated files
in this add-on are the three vendored third-party libraries under
`vendor/`, which are unmodified upstream builds (see below) - permitted
under ATN's source policy as "external open-source libraries".

## 1. Build environment requirements

- **Operating system**: any OS that can run PowerShell 5.1+ (Windows,
  or macOS/Linux with [PowerShell 7](https://github.com/PowerShell/PowerShell)
  installed). The build was created and tested on Windows 11 with the
  Windows-native PowerShell 5.1 (`powershell.exe`), part of the OS - no
  separate install is required on Windows.
- **No Node.js, npm, or any other toolchain is required to build the
  `.xpi`.** Node.js/npm were only used *during development* to run
  `web-ext lint` for validation and to run the automated test suite under
  `tests/` (see `README.md`, "Running the automated test suite") - neither
  plays any part in producing the packaged add-on itself, and
  `package.ps1` excludes `tests/`, `node_modules/`, `package.json`, and
  `package-lock.json` from the packaged `.xpi`.
- **Git** (any recent version) to clone the repository.

## 2. Step-by-step: reproduce this exact package

1. Clone the repository and check out the tag matching this submission's
   version:
   ```powershell
   git clone https://github.com/andyesys/thunderbird-markdown-paste-extension.git
   cd thunderbird-markdown-paste-extension
   git checkout v1.0.4
   ```
2. The `vendor/` directory in the repository already contains the exact
   third-party library builds used by this add-on. These are unmodified
   files downloaded as-is from the upstream projects (see `VENDOR.md` for
   the exact version and source URL of each). To re-download them from
   scratch instead of using the copies already in the repo:
   ```powershell
   Invoke-WebRequest "https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js" -OutFile vendor/marked.min.js
   Invoke-WebRequest "https://cdn.jsdelivr.net/npm/dompurify@3.4.11/dist/purify.min.js" -OutFile vendor/purify.min.js
   Invoke-WebRequest "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js" -OutFile vendor/highlight.min.js
   Invoke-WebRequest "https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github.min.css" -OutFile vendor/highlight-github.min.css
   ```
3. Run the build/packaging script from the repository root:
   ```powershell
   .\package.ps1
   ```
   This script (see `package.ps1` in the repository root) zips the
   repository's source files - `manifest.json`, `background.js`,
   `composescript.js`, `composestyles.css`, `icons/`, `vendor/`, `LICENSE`,
   `README.md`, `VENDOR.md` - into `markdown-paste.xpi`, excluding only
   development-only files (`.git`, this build script itself, and any
   previous build output). No other transformation is applied.
4. The resulting `markdown-paste.xpi` is byte-for-byte reproducible from
   the source in this repository (given the same vendor library versions),
   and matches the file submitted to addons.thunderbird.net for this
   version.

## 3. Verifying the build

```powershell
npx web-ext@latest lint --source-dir .
```
(Requires Node.js/npm only for this optional linting step - not for the
build itself.) This should report 0 errors.
