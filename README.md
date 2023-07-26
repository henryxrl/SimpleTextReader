# SimpleTextReader - 易笺

SimpleTextReader is the online text reader that simulates the result of SimpleEpub2, providing a web-based reading experience.

Try it here: [https://txt.xrl.app](https://txt.xrl.app)

## Important Updates

### Version 1.0

Now SimpleTextReader is also available as a Chrome/Firefox extension with two distinct versions:

1. Regular version: Upon clicking the icon from the extension list, the full UI appears, providing the same functionality as the complete SimpleTextReader web app.

2. No-UI version: Once activated, any URL ending in ".txt" will be automatically opened using SimpleTextReader. However, please be aware that this version might have slower performance when opening large text files. The delay is due to the browser's default behavior of loading the entire file at once, which cannot be modified.

To utilize either version, navigate to the `manifests` directory, choose either `Chrome` or `Firefox` directory depending on your browser of choice, and copy the desired version of `manifest.json` into the root directory. Then load the extension in the browser under `Developer mode`.

### Version 1.1

Now SimpleTextReader can be installed as a PWA in supported browsers (Chromium-based browsers such as Chrome and Edge).

### Desktop Application

Added code to package the web project as a desktop application using Tauri.

To build and compile the software, please follow these steps:

1. Install Tauri by following the prerequisites mentioned in the [Tauri Documentation](https://tauri.app/v1/guides/getting-started/prerequisites).
2. Run the following command in your terminal: `cargo tauri build`
3. After compiling, the resulting files can be found in the `src-tauri\target\release\bundle` folder.

---

### This project is only for personal use and for learning purpose, not for commercial use.
