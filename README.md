# Fish and fish

Have fun curating information with your friends !

## What is this ?

This is a chrome extension that allows you to curate information with your friends. Whenever you are on a webpage, click on the extension to find similar pages in your bookmarks or the ones of your friends.

## Initial creators

- Dhruv Agarwal
- Maxime Vidal https://vmax.one/
- Aurélien Morel https://twitter.com/aurelien_morel

## Development setup

### Developing

This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open chrome extensions, enable developer mode, and load the extension from the build/chrome-mv3-dev by clicking on Load unpacked extension.

### Making production build

Run the following:

```bash
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

### Submiting to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
