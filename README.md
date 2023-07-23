# SimpleTextReader

SimpleTextReader is the online text reader that simulates the result of SimpleEpub2, providing a web-based reading experience.

Try it here: [https://txt.xrl.app](https://txt.xrl.app)

## Important update

Now SimpleTextReader is also available as a Chrome/Firefox extension with two distinct versions:

1. Regular version: Upon clicking the icon from the extension list, the full UI appears, providing the same functionality as the complete SimpleTextReader web app.

2. No-UI version: Once activated, any URL ending in ".txt" will be automatically opened using SimpleTextReader. However, please be aware that this version might have slower performance when opening large text files. The delay is due to the browser's default behavior of loading the entire file at once, which cannot be modified.

To utilize either version, navigate to the `manifests` directory, choose either `Chrome` or `Firefox` directory depending on your browser of choice, and copy the desired version of `manifest.json` into the root directory. Then load the extension in the browser under `Developer mode`.

---

### This project is only for personal use and for learning purpose, not for commercial use.
