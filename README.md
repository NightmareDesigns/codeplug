# DDEplug decrypter starter

Starter DDEplug decrypter project with:

- Electron desktop GUI
- Native C decryptor executable (`native/decrypter.c`)

## Quick start

```bash
npm install
npm start
```

`npm start` builds the native binary first, then opens the Electron app.

## Native decryptor

Build manually:

```bash
npm run build:native
```

Run manually:

```bash
./native/bin/decrypter <input_file> <output_file> [hex_key]
```

Current starter logic uses XOR with key `0xAA` by default so the UI/backend flow is ready for real DDEplug crypto work next.
