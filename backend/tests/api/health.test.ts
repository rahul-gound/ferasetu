import request from 'supertest';
import app from '../../src/index';

describe('Health and System Endpoints', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/csrf-token should return 200 with a new token', async () => {
    const res = await request(app).get('/api/csrf-token');
    expect(res.status).toBe(200);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  describe('GET /api/geo Smart Language & Region Detection', () => {
    it('should map Tamil Nadu (IN-TN) to Tamil (ta) and INR pricing', async () => {
      const res = await request(app)
        .get('/api/geo')
        .set('x-user-country', 'IN')
        .set('x-user-region-code', 'TN');
      expect(res.status).toBe(200);
      expect(res.body.country).toBe('IN');
      expect(res.body.region).toBe('IN');
      expect(res.body.suggestedLanguage).toBe('ta');
      expect(res.body.currency).toBe('INR');
      expect(res.body.permanentFreePlan).toBe(true);
    });

    it('should map Maharashtra (IN-MH) to Marathi (mr)', async () => {
      const res = await request(app)
        .get('/api/geo')
        .set('x-user-country', 'IN')
        .set('x-user-region', 'Maharashtra');
      expect(res.status).toBe(200);
      expect(res.body.country).toBe('IN');
      expect(res.body.suggestedLanguage).toBe('mr');
    });

    it('should map France (FR) to French (fr) and EU pricing without permanent free plan', async () => {
      const res = await request(app)
        .get('/api/geo')
        .set('x-user-country', 'FR');
      expect(res.status).toBe(200);
      expect(res.body.country).toBe('FR');
      expect(res.body.region).toBe('EU');
      expect(res.body.suggestedLanguage).toBe('fr');
      expect(res.body.currency).toBe('EUR');
      expect(res.body.permanentFreePlan).toBe(false);
    });

    it('should map US to English (en) and US pricing', async () => {
      const res = await request(app)
        .get('/api/geo')
        .set('x-user-country', 'US');
      expect(res.status).toBe(200);
      expect(res.body.country).toBe('US');
      expect(res.body.region).toBe('US');
      expect(res.body.suggestedLanguage).toBe('en');
      expect(res.body.currency).toBe('USD');
      expect(res.body.permanentFreePlan).toBe(false);
    });
  });
});

