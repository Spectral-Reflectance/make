import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const site = 'https://www.make.spectralreflectance.space';
const root = new URL('../', import.meta.url);
const pages = new Map([
  ['/', 'index.html'],
  ['/licence/', 'licence/index.html'],
]);

const read = (path) => readFileSync(new URL(path, root), 'utf8');
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, contents]) => JSON.parse(contents));

describe('static discovery files', () => {
  it('lists only the homepage and licence as canonical HTML pages', () => {
    const sitemap = read('public/sitemap.xml');
    const llms = read('public/llms.txt');
    const robots = read('public/robots.txt');
    expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`);
    for (const [route, path] of pages) {
      const html = read(path);
      expect(html).toContain(`<link rel="canonical" href="${site}${route}" />`);
      expect(html).toMatch(/<h1[\s>]/);
      expect(sitemap).toContain(`<loc>${site}${route}</loc>`);
      expect(llms).toContain(`${site}${route}`);
      expect(html).toContain('href="/llms.txt"');
    }
    for (const design of ['trust-the-agent', 'stac-or-it-doesnt-exist']) {
      expect(existsSync(new URL(`designs/${design}/index.html`, root))).toBe(false);
      expect(sitemap).not.toContain(`/designs/${design}/`);
      expect(llms).not.toContain(`/designs/${design}/`);
      expect(read('index.html')).not.toContain(`/designs/${design}/`);
    }
    expect(read('index.html')).toContain('href="/?design=trust-the-agent#maker"');
    expect(read('index.html')).toContain('href="/?design=stac#maker"');
  });

  it('describes the browser tool and both models on the homepage', () => {
    const home = read('index.html');
    const [metadata] = jsonLd(home);
    const graph = metadata['@graph'];
    expect(graph.map(({ '@type': type }) => type)).toEqual(['WebSite', 'SoftwareApplication', '3DModel', '3DModel']);
    const catalog = JSON.parse(read('public/assets/catalog.json'));
    for (const design of catalog.designs) {
      const model = graph.find((node) => node['@id'] === `${site}/#${design.id}-model`);
      expect(model).toBeTruthy();
      expect(model.license).toBe(`${site}/licence/`);
      expect(model.url).toBe(`${site}/?design=${design.id}#maker`);
      const urls = model.encoding.map(({ contentUrl }) => contentUrl);
      expect(urls).toEqual([
        ...design.paletteIds.map((paletteId) => `${site}/assets/${design.id}-${paletteId}.3mf`),
        `${site}/assets/${design.id}.stl`,
      ]);
      expect(model.encoding.map(({ encodingFormat }) => encodingFormat))
        .toEqual([...design.paletteIds.map(() => 'model/3mf'), 'model/stl']);
      for (const url of urls) {
        const path = new URL(url).pathname;
        expect(existsSync(new URL(`public${path}`, root))).toBe(true);
      }
      expect(home).toContain(`href="/assets/${design.id}-${design.paletteIds[0]}.3mf"`);
      expect(home).toContain(`href="/assets/${design.id}.stl"`);
    }
  });
});
