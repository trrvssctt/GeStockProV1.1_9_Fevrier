
import express from 'express';
import dotenv from 'dotenv';
// Load environment variables from .env early
dotenv.config();
import path from 'path';
import cors from 'cors';
import { connectDB } from './config/database.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Middlewares de base
// Mise à jour CORS pour supporter les requêtes cross-origin du frontend
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const allowedOrigins = FRONTEND_URL.split(',').map(s => s.trim().replace(/\/$/, ''));
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) which have no origin
    if (!origin) return callback(null, true);
    // In dev, be permissive to avoid repeated CORS friction
    if ((process.env.NODE_ENV || 'development') !== 'production') return callback(null, true);

    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) return callback(null, true);

    // Log rejected origin for debugging
    // eslint-disable-next-line no-console
    console.error('[CORS] Rejected origin:', origin, 'allowed:', allowedOrigins);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// Use raw body for payment webhooks (Stripe requires raw body to verify signature)
// Ce middleware doit être AVANT express.json() pour les routes de webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes API v1
app.use('/api', apiRoutes);

// Serve uploaded files (fallback local storage)
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// If a frontend `dist` folder exists (single-repo deployment), serve it as static files
// Try common locations and pick the first existing one so deployments are robust.
const candidateDists = [
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), '..', 'dist'),
  path.join(process.cwd(), '..', 'frontend', 'dist')
];
let frontendDist = null;
for (const cand of candidateDists) {
  try {
    const stat = require('fs').statSync(cand);
    if (stat && stat.isDirectory()) {
      frontendDist = cand;
      break;
    }
  } catch (err) {
    // ignore missing paths
  }
}
if (frontendDist) {
  console.log('Serving frontend from', frontendDist);
  // Use express.static to let Express set correct MIME types
  app.use(express.static(frontendDist));
  // SPA fallback: for any non-API GET request, return index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    const indexPath = path.join(frontendDist, 'index.html');
    // Prevent CDN/browser from caching the HTML entrypoint so clients always
    // fetch the latest asset manifest (avoids mismatched hashed bundles).
    res.type('html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
} else {
  console.log('No frontend `dist` directory found in candidates:', candidateDists);
}

// Health Check
app.get('/health', (req, res) => res.send('GeStockPro Kernel Online'));

// Gestionnaire d'erreurs (doit être en dernier)
app.use(errorHandler);

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 GeStockPro API running on port ${PORT} (FRONTEND_URL=${FRONTEND_URL})`);
});
