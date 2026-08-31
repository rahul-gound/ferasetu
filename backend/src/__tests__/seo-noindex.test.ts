import fs from 'fs';
import path from 'path';
import http from 'http';
import express from 'express';
import sitemapRoutes from '../routes/sitemap';

describe('SEO Noindex & Crawler Configuration', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    const testApp = express();
    // Replicate security headers + X-Robots-Tag
    testApp.use((_req, res, next) => {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      next();
    });
    testApp.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    testApp.use('/sitemap.xml', sitemapRoutes);

    server = testApp.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address) {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Express Backend HTTP Headers', () => {
    it('returns X-Robots-Tag: noindex, nofollow on /health', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      const data = (await res.json()) as { status?: string };
      expect(data.status).toBe('ok');
    });

    it('returns X-Robots-Tag: noindex, nofollow on 404 responses', async () => {
      const res = await fetch(`${baseUrl}/non-existent-route-${Date.now()}`);
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    });

    it('returns 404 and X-Robots-Tag on /sitemap.xml (sitemap disabled)', async () => {
      const res = await fetch(`${baseUrl}/sitemap.xml`);
      expect(res.status).toBe(404);
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    });
  });

  describe('Frontend Static Configuration', () => {
    const frontendDir = path.resolve(__dirname, '../../../frontend');

    it('index.html does not contain a global noindex meta tag', () => {
      const htmlPath = path.join(frontendDir, 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);
      const content = fs.readFileSync(htmlPath, 'utf8');
      expect(content).not.toMatch(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i);
    });

    it('public/robots.txt allows crawling so noindex can be discovered', () => {
      const robotsPath = path.join(frontendDir, 'public/robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);
      const content = fs.readFileSync(robotsPath, 'utf8');
      expect(content).toMatch(/User-agent:\s*\*/i);
      expect(content).toMatch(/Allow:\s*\//i);
      expect(content).not.toMatch(/Disallow:\s*\//i);
      expect(content).not.toMatch(/sitemap/i);
    });

    it('public/_headers preserves security headers without a global noindex directive', () => {
      const headersPath = path.join(frontendDir, 'public/_headers');
      expect(fs.existsSync(headersPath)).toBe(true);
      const content = fs.readFileSync(headersPath, 'utf8');
      expect(content).not.toMatch(/\/\*[\s\S]*X-Robots-Tag:\s*noindex,\s*nofollow/i);
      expect(content).toMatch(/X-Frame-Options:\s*SAMEORIGIN/i);
      expect(content).toMatch(/X-Content-Type-Options:\s*nosniff/i);
    });

    it('public/sitemap.xml is absent (not actively advertised)', () => {
      const sitemapPath = path.join(frontendDir, 'public/sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(false);
    });
  });

  describe('Cloudflare Worker Response Configuration', () => {
    const workerDir = path.resolve(__dirname, '../../../worker');

    it('worker/index.js default JSON headers include X-Robots-Tag: noindex, nofollow', () => {
      const workerIndexPath = path.join(workerDir, 'index.js');
      expect(fs.existsSync(workerIndexPath)).toBe(true);
      const content = fs.readFileSync(workerIndexPath, 'utf8');
      expect(content).toMatch(/["']X-Robots-Tag["']:\s*["']noindex,\s*nofollow["']/i);
    });

    it('worker/routes/admin.js JSON headers include X-Robots-Tag: noindex, nofollow', () => {
      const adminPath = path.join(workerDir, 'routes/admin.js');
      expect(fs.existsSync(adminPath)).toBe(true);
      const content = fs.readFileSync(adminPath, 'utf8');
      expect(content).toMatch(/["']X-Robots-Tag["']:\s*["']noindex,\s*nofollow["']/i);
    });
  });
});
