import { Router, Request, Response } from 'express';

const router = Router();

// Sitemaps are intentionally disabled as FeraSetu pages use noindex, nofollow
router.get('/', (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Sitemap not found', message: 'Sitemaps are disabled on this instance.' });
});

export default router;

