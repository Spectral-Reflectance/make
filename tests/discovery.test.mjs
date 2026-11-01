import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const site = 'https://www.make.spectralreflectance.space';
const root = new URL('../', import.meta.url);
const routes = new Map([
  ['/', 'index.html'],
  ['/designs/trust-the-agent/', 'designs/trust-the-agent/index.html'],
  ['/designs/stac-or-it-doesnt-exist/', 'designs/stac-or-it-doesnt-exist/index.html'],
  ['/licence/', 'licence/index.html'],
]);

const read = (path) => readFileSync(new URL(path, root), 'utf8');
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, contents]) => JSON.parse(contents));

describe('static discovery files', () => {
  it('links every canonical, readable HTML page from the sitemap and llms.txt', () => {
    const sitemap = read('public/sitemap.xml');
    const llms = read('public/llms.txt');
    const robots = read('public/robots.txt');
    expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`);
    for (const [route, path] of routes) {
      const html = read(path);
      expect(html).toContain(`<link rel="canonical" href="${site}${route}" />`);
      expect(html).toMatch(/<h1[\s>]/);
      expect(sitemap).toContain(`<loc>${site}${route}</loc>`);
      expect(llms).toContain(`${site}${route}`);
      expect(html).toContain('href="/llms.txt"');
    }
    expect(read('index.html')).toContain('href="/designs/stac-or-it-doesnt-exist/"');
    expect(read('index.html')).toContain('href="/designs/trust-the-agent/"');
  });

  it('describes the browser tool and real downloadable model files', () => {
    const [home] = jsonLd(read('index.html'));
    expect(home['@graph'].map(({ '@type': type }) => type)).toEqual(['WebSite', 'SoftwareApplication']);
    for (const [, path] of [...routes].filter(([route]) => route.startsWith('/designs/'))) {
      const html = read(path);
      const [model] = jsonLd(html);
      expect(model['@type']).toBe('3DModel');
      expect(model.license).toBe(`${site}/licence/`);
      expect(model.encoding.map(({ encodingFormat }) => encodingFormat)).toContain('model/3mf');
      expect(model.encoding.map(({ encodingFormat }) => encodingFormat)).toContain('model/stl');
      for (const file of model.encoding) {
        const url = new URL(file.contentUrl);
        expect(url.origin).toBe(site);
        expect(existsSync(new URL(`public${url.pathname}`, root))).toBe(true);
        expect(html).toContain(`href="${url.pathname}"`);
      }
    }
  });
});
