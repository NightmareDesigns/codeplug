# DDEplug decrypter starter

Starter DDEplug decrypter project with:

- Electron desktop GUI
- Native C decryptor executable (`native/decrypter.c`)
- Built-in file explorer flow for `.xctb` input/output selection
- Guided UI with path validation, smart output suggestions, and richer status feedback

## Quick start

```bash
npm install
npm start
```

`npm start` builds the native binary first, then opens the Electron app.
The native build now runs through `node native/build.js` so it also works on Windows without `sh`.
The desktop app now includes browse dialogs for selecting encrypted and decrypted `.xctb` files.

## Native decryptor

Build manually:

```bash
npm run build:native
```

`build:native` tries `cc`, `gcc`, `clang` (or `gcc`, `clang`, `cl` on Windows) and writes the binary to `native/bin/`.

Run manually:

```bash
./native/bin/decrypter <input_file> <output_file> [hex_key]
```

Current starter logic uses XOR with key `0xAA` by default so the UI/backend flow is ready for real DDEplug crypto work next.
The app currently expects `.xctb` input and output paths.
The renderer also suggests output names like `name.decrypted.xctb` and creates missing output folders automatically.
