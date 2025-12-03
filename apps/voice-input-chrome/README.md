# 🎤 Voice Input - Chrome Extension

A simple Chrome extension that lets you insert text with your voice anywhere in Chrome.

## ✨ Features

- 🎤 **Voice-to-Text**: Speak and see your words transcribed in real-time
- ⌨️ **Keyboard Shortcut**: Press `Ctrl+Shift+Space` (or `Cmd+Shift+Space` on Mac)
- 🎯 **Insert Anywhere**: Works in text fields, textareas, and contenteditable elements
- 🎨 **Beautiful UI**: Modern gradient design with smooth animations
- 🚀 **Fast**: Instant activation and transcription
- 🔒 **Privacy**: Uses Chrome's built-in Web Speech API

## 🚀 Installation

### Method 1: Load Unpacked (Development)

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Or click the puzzle icon → "Manage Extensions"

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to `/home/guy/mono/apps/voice-input-chrome`
   - Click "Select Folder"

4. **Done!** 
   - You should see the Voice Input extension with a microphone icon

### Method 2: Package and Install

```bash
# From the extension directory
cd apps/voice-input-chrome
zip -r voice-input-chrome.zip .

# Then drag voice-input-chrome.zip to chrome://extensions/
```

## 🎯 How to Use

### Option 1: Keyboard Shortcut (Recommended)

1. Click in any text field
2. Press `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac)
3. Speak into your microphone
4. Click "Insert Text" or wait for it to auto-insert

### Option 2: Extension Icon

1. Click the Voice Input extension icon in your toolbar
2. The popup will open and start listening automatically
3. Speak your text
4. Click "Insert Text"

## ⚙️ Configuration

### Change the Keyboard Shortcut

1. Go to `chrome://extensions/shortcuts`
2. Find "Voice Input"
3. Click the pencil icon next to "Activate voice input"
4. Press your desired key combination
5. Click "OK"

## 🎨 How It Works

```
User presses Ctrl+Shift+Space
         ↓
Extension popup opens
         ↓
Web Speech API starts listening
         ↓
Speech is transcribed in real-time
         ↓
User clicks "Insert Text"
         ↓
Text is inserted at cursor position
```

## 📋 Supported Elements

The extension can insert text into:
- ✅ `<input>` fields
- ✅ `<textarea>` elements
- ✅ `contenteditable` divs (like Gmail, Google Docs)
- ✅ Most rich text editors

## 🐛 Troubleshooting

### "Microphone permission denied"

1. Click the microphone icon in Chrome's address bar
2. Select "Always allow" for the extension
3. Reload the page and try again

### "No speech detected"

- Check your microphone is working
- Speak louder or closer to the mic
- Check system microphone settings

### Shortcut doesn't work

- Go to `chrome://extensions/shortcuts`
- Make sure the shortcut is set
- Check for conflicts with other extensions
- Try a different key combination

### Text doesn't insert

- Make sure you clicked in a text field first
- Try clicking "Insert Text" instead of waiting
- Some websites may block programmatic text insertion

## 🎯 Use Cases

- **Email**: Dictate emails in Gmail
- **Forms**: Fill out long forms quickly
- **Chat**: Send messages hands-free
- **Documents**: Write in Google Docs with your voice
- **Social Media**: Post updates by speaking
- **Search**: Voice search in Google

## 🔮 Future Enhancements

- [ ] Auto-insert after speech ends
- [ ] Multiple language support
- [ ] Custom voice commands
- [ ] Punctuation commands ("period", "comma")
- [ ] Text formatting ("new paragraph", "all caps")
- [ ] History of recent transcriptions

## 📁 Files

```
voice-input-chrome/
├── manifest.json       # Extension configuration
├── popup.html          # UI layout
├── popup.js            # Speech recognition logic
├── background.js       # Keyboard shortcut handler
├── icon16.png          # Extension icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Extension icon (128x128)
└── README.md           # This file
```

## 🔒 Privacy

- **No data collection**: Everything happens locally in your browser
- **No external servers**: Uses Chrome's built-in Web Speech API
- **No tracking**: No analytics or telemetry
- **Open source**: You can inspect all the code

## 💡 Tips

1. **Speak clearly** at a normal pace
2. **Use punctuation commands**: Say "period", "comma", "question mark"
3. **Pause briefly** between sentences
4. **Review before inserting** to catch any errors
5. **Click in the field first** for best results

## 🆚 Chrome Extension vs Standalone App

| Feature | Chrome Extension | Standalone App |
|---------|-----------------|----------------|
| **Installation** | ⭐⭐⭐⭐⭐ Easy | ⭐⭐⭐ Moderate |
| **Works in Chrome** | ✅ Yes | ✅ Yes |
| **Works outside Chrome** | ❌ No | ✅ Yes |
| **System-wide hotkey** | ⚠️ Chrome only | ✅ Everywhere |
| **Setup time** | ⭐⭐⭐⭐⭐ 1 minute | ⭐⭐⭐ 5 minutes |

## 🎊 You're Ready!

The extension is installed and ready to use. Just press **Ctrl+Shift+Space** in any Chrome text field and start speaking!

---

**Enjoy your voice-powered typing in Chrome! 🎤✨**
