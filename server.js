
import express from 'express';
import path from 'path';
import cors from 'cors';
import { connectDB } from './config/database.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Middlewares de base
// Mise à jour CORS pour supporter les requêtes cross-origin du frontend
app.use(cors({
  origin: '*', // Autorise toutes les origines pour la flexibilité du déploiement
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

// Health Check
app.get('/health', (req, res) => res.send('GeStockPro Kernel Online'));

// Gestionnaire d'erreurs (doit être en dernier)
app.use(errorHandler);

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 GeStockPro API running on http://localhost:${PORT}`);
});
