# 🎤 Voice Input Available!

A **system-wide speech-to-text** application has been added to this monorepo.

## Quick Start

```bash
./start-voice-input.sh
```

Then press **Ctrl+Shift+Space** from anywhere to activate voice input!

## Features

- ✅ Works in **any application** (not just browsers)
- ✅ **Global hotkey** activation
- ✅ **Lightweight** Python-based implementation
- ✅ **Auto-installs** dependencies on first run

## Location

The app is in `apps/voice-input/` but runs **independently** from the main dev workflow.

See `apps/voice-input/README.md` for full documentation.

---

**Note:** Voice Input is excluded from `pnpm run dev` because it's a standalone desktop utility with different runtime requirements.
