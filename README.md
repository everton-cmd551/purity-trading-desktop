# Purity Trading ERP - Desktop Client

A lightweight Electron wrapper that loads the Purity Trading ERP web application.

## Features
- Loads the live Purity Trading ERP from `puritytrading.vercel.app`
- Automatic updates — users get notified when a new version is available
- Desktop shortcut and native window experience

## For Developers
```bash
npm install
npm start       # Run in dev mode
npm run dist    # Build installer
```

## Releasing a New Version
1. Bump `version` in `package.json`
2. Commit and push to `main`
3. GitHub Actions will build and publish the release automatically
4. Users will be prompted to update on their next app launch
