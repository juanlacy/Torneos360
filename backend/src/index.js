import 'dotenv/config';

if (!process.env.TZ) process.env.TZ = 'America/Argentina/Buenos_Aires';

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { logSystem } from './config/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './config/socket.js';

// ─── Importar modelos (carga asociaciones) ──────────────────────────────────
import { sequelize } from './models/index.js';

// ─── Importar rutas ──────────────────────────────────────────────────────────
import authRoutes      from './routes/auth.js';
import adminRoutes     from './routes/admin.js';
import permisosRoutes  from './routes/permisos.js';
import torneosRoutes   from './routes/torneos.js';
import clubesRoutes    from './routes/clubes.js';
import jugadoresRoutes from './routes/jugadores.js';
import staffRoutes     from './routes/staff.js';
import arbitrosRoutes   from './routes/arbitros.js';
import veedoresRoutes   from './routes/veedores.js';
import fixtureRoutes    from './routes/fixture.js';
import partidosRoutes   from './routes/partidos.js';
import posicionesRoutes      from './routes/posiciones.js';
import configuracionRoutes   from './routes/configuracion.js';
import informesRoutes        from './routes/informes.js';

// ─── Swagger ─────────────────────────────────────────────────────────────────
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Torneo360 API',
      version: '1.0.0',
      description: 'API de Torneo360 - Gestion de Torneos de Baby Futbol',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 7300}`, description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const app = express();
const PORT = process.env.PORT || 7300;

// Necesario cuando esta detras de Nginx
app.set('trust proxy', 1);

const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:4300')
  .split(',')
  .map(u => u.trim().replace(/['"]/g, ''))
  .filter(Boolean);

// ─── Middleware global ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(cors({
  origin: FRONTEND_URLS.length === 1 ? FRONTEND_URLS[0] : FRONTEND_URLS,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);

// ─── Rate limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.', code: 'RATE_LIMITED' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Espera un momento.', code: 'RATE_LIMITED' },
});

// ─── Swagger UI ──────────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Rutas de autenticacion ─────────────────────────────────────────────────
app.use('/auth/login',           authLimiter);
app.use('/auth/google',          authLimiter);
app.use('/auth/microsoft',       authLimiter);
app.use('/auth/register',        authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth', apiLimiter, authRoutes);

// ─── Archivos estaticos (avatares, uploads) ─────────────────────────────────
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
mkdirSync(join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'escudos'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'jugadores'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'informes'), { recursive: true });
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// ─── Rutas protegidas ───────────────────────────────────────────────────────
app.use('/admin',     apiLimiter, adminRoutes);
app.use('/permisos',  apiLimiter, permisosRoutes);
app.use('/torneos',   apiLimiter, torneosRoutes);
app.use('/clubes',    apiLimiter, clubesRoutes);
app.use('/jugadores', apiLimiter, jugadoresRoutes);
app.use('/staff',     apiLimiter, staffRoutes);
app.use('/arbitros',   apiLimiter, arbitrosRoutes);
app.use('/veedores',   apiLimiter, veedoresRoutes);
app.use('/fixture',    apiLimiter, fixtureRoutes);
app.use('/partidos',   apiLimiter, partidosRoutes);
app.use('/posiciones',    apiLimiter, posicionesRoutes);
app.use('/configuracion', apiLimiter, configuracionRoutes);
app.use('/informes',      apiLimiter, informesRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = { api: 'ok', database: 'unknown' };
  let httpStatus = 200;

  try {
    await sequelize.authenticate();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    httpStatus = 503;
  }

  res.status(httpStatus).json({
    status: httpStatus === 200 ? 'healthy' : 'degraded',
    checks,
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Iniciar servidor con Socket.io ─────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    logSystem('Conexion a base de datos establecida', 'info');

    // Sync modelos — alter:true solo en dev
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    await sequelize.sync({ alter: isDev });
    logSystem('Modelos sincronizados', 'info');

    // Crear HTTP server y Socket.io
    const server = http.createServer(app);
    initSocket(server, FRONTEND_URLS);

    server.listen(PORT, () => {
      logSystem(`Torneo360 API corriendo en puerto ${PORT}`, 'info');
      logSystem(`Swagger docs: http://localhost:${PORT}/api-docs`, 'info');
    });
  } catch (error) {
    logSystem('Error al iniciar servidor', 'error', { error: error.message });
    process.exit(1);
  }
})();
