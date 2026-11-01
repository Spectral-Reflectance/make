# Spectral Reflectance // make

The standalone, static website for [www.make.spectralreflectance.space](https://www.make.spectralreflectance.space/). It lets visitors preview two bag tags, choose colours, and download prebuilt 3MF or STL files.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Run `npm test` before publishing. The site is built with Vite and needs no backend or database at runtime.

## Publishing

GitHub Pages publishes the committed `docs/` folder on `main`. After changing the site, run `npm test` and `npm run build:pages`, commit the source and updated `docs/` files, then push. The build command copies only the production site into `docs/`, including its `CNAME` and `.nojekyll` files.

In **Settings → Pages**, use **Deploy from a branch**, `main`, `/docs`. Set the custom domain to `www.make.spectralreflectance.space`, then point its DNS `CNAME` to `spectral-reflectance.github.io`.

The printable assets under `public/assets/` were exported from Bag Tag Studio. Editable TagDesign JSON and the geometry backend are not part of this website repository. The 3MF files contain separate colour-intent solids; users must inspect the models and sliced layers in Bambu Studio before printing. Slicer and physical print compatibility have not been verified by this repository's tests.

The design licence and artwork credits are published at [`/licence/`](https://www.make.spectralreflectance.space/licence/). That licence does not cover the website code, photographs, or associated trademarks.
