import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  handleAcceptOffer,
  handleCreateListing,
  handleCreateOffer,
  handleCreateTrade,
  handleDeliverTrade,
  handleGetForecast,
  handleGetMarket,
  handleMarketStrategy,
  handleGetTrade,
  handleGetTradeMessages,
  handleGradeUpload,
  handlePostMessage,
  handleTradeAssist,
  handleWalletChallenge,
  handleWalletVerify,
  handleAgentProof,
  handleAgentMetadata,
  handleRegistryPrepare,
  handleRegistryConfirm,
  makeError,
  makeSuccess,
} from './lib/api/handlers.ts';
import { FIXTURE_IDS } from './lib/fixtures/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MiB limit
});

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // API Routes matching exact contract
  app.get('/api/market', async (req: Request, res: Response) => {
    const date = req.query.date as string | undefined;
    const produce = req.query.produce as string | undefined;
    const mode = req.query.mode as string | undefined;
    const result = await handleGetMarket({ date, produce, mode });
    res.status(result.status).json(result.body);
  });

  app.post('/api/market/strategy', async (req: Request, res: Response) => {
    const result = await handleMarketStrategy(req.body);
    res.status(result.status).json(result.body);
  });

  // POST /api/grades: accepts multipart/form-data field 'image' and 'locale'
  app.post('/api/grades', upload.single('image'), async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.growerFatima;
    const locale = (req.body?.locale as string) || 'en-PK';
    const filenameHint = req.file?.originalname || (req.body?.filename as string | undefined);

    let buffer: Buffer | undefined = req.file?.buffer;
    if (!buffer && req.body?.imageBase64) {
      const cleanBase64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!buffer) {
      return res.status(400).json(makeError('INVALID_INPUT', 'Missing image file or payload'));
    }

    const result = await handleGradeUpload(buffer, locale, actorId, Boolean(req.body?.saveBytes), filenameHint);
    res.status(result.status).json(result.body);
  });

  // GET /api/forecast?date=YYYY-MM-DD&produce=tomato
  app.get('/api/forecast', async (req: Request, res: Response) => {
    const date = req.query.date as string | undefined;
    const produce = req.query.produce as string | undefined;
    const result = await handleGetForecast({ date, produce });
    res.status(result.status).json(result.body);
  });

  app.post('/api/listings', async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.growerFatima;
    const result = await handleCreateListing(req.body, actorId, idempotencyKey);
    res.status(result.status).json(result.body);
  });

  app.post('/api/trades', async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handleCreateTrade(req.body, actorId, idempotencyKey);
    res.status(result.status).json(result.body);
  });

  app.get('/api/trades/:id', async (req: Request, res: Response) => {
    const actorId = req.headers['x-agent-id'] as string | undefined;
    const result = await handleGetTrade(req.params.id, actorId);
    res.status(result.status).json(result.body);
  });

  // Incremental polling route with cursor (created_at, id)
  app.get('/api/trades/:id/messages', async (req: Request, res: Response) => {
    const actorId = req.headers['x-agent-id'] as string | undefined;
    const afterCreatedAt = req.query.after as string | undefined;
    const afterId = req.query.afterId as string | undefined;
    const result = await handleGetTradeMessages(req.params.id, afterCreatedAt, afterId, actorId);
    res.status(result.status).json(result.body);
  });

  app.post('/api/trades/:id/messages', async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handlePostMessage(req.params.id, req.body, actorId);
    res.status(result.status).json(result.body);
  });

  // POST /api/trades/:id/assist: AI Bargaining Assistant
  app.post('/api/trades/:id/assist', async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handleTradeAssist(req.params.id, req.body, actorId);
    res.status(result.status).json(result.body);
  });

  app.post('/api/trades/:id/offers', async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handleCreateOffer(req.params.id, req.body, actorId, idempotencyKey);
    res.status(result.status).json(result.body);
  });

  app.post('/api/trades/:id/accept', async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.growerFatima;
    const rawBody = JSON.stringify(req.body);
    const requestHash = Buffer.from(rawBody).toString('hex').slice(0, 64);
    const result = await handleAcceptOffer(req.params.id, req.body, actorId, idempotencyKey, requestHash);
    res.status(result.status).json(result.body);
  });

  app.post('/api/trades/:id/deliver', async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const rawBody = JSON.stringify(req.body);
    const requestHash = Buffer.from(rawBody).toString('hex').slice(0, 64);
    const result = await handleDeliverTrade(req.params.id, req.body, actorId, idempotencyKey, requestHash);
    res.status(result.status).json(result.body);
  });

  // Backward-compatible grading alias
  app.post('/api/providers/grade', async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.growerFatima;
    const { imageBase64, produce, filename, locale } = req.body;
    let buffer: Buffer | undefined;
    if (imageBase64) {
      const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(clean, 'base64');
    }
    if (buffer) {
      const result = await handleGradeUpload(
        buffer,
        locale === 'ur-PK' ? 'ur-PK' : 'en-PK',
        actorId,
        false,
        filename || produce
      );
      return res.status(result.status).json(result.body);
    }
    res.status(400).json(makeError('INVALID_INPUT', 'Missing imageBase64'));
  });

  // Solana Devnet Agent Registry & Wallet Challenge Routes
  app.post('/api/wallet/challenge', async (req: Request, res: Response) => {
    const result = await handleWalletChallenge(req.body);
    res.status(result.status).json(result.body);
  });

  app.post('/api/wallet/verify', async (req: Request, res: Response) => {
    const result = await handleWalletVerify(req.body);
    res.status(result.status).json(result.body);
  });

  app.get('/api/agents/:id/proof', async (req: Request, res: Response) => {
    const result = await handleAgentProof(req.params.id);
    res.status(result.status).json(result.body);
  });

  app.get('/api/agents/:id/metadata', async (req: Request, res: Response) => {
    const result = await handleAgentMetadata(req.params.id);
    res.status(result.status).json(result.body);
  });

  app.post('/api/registry/prepare', async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handleRegistryPrepare(req.body, actorId);
    res.status(result.status).json(result.body);
  });

  app.post('/api/registry/confirm', async (req: Request, res: Response) => {
    const actorId = (req.headers['x-agent-id'] as string) || FIXTURE_IDS.buyerTariq;
    const result = await handleRegistryConfirm(req.body, actorId);
    res.status(result.status).json(result.body);
  });

  // Dev server or Production static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MandiLink server listening at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MandiLink server:', err);
});
