
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT) || 8080;
const BUILD_PATH = path.join(__dirname, 'dist');

// --- FIREBASE ADMIN SETUP ---
let adminApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      adminApp = getApps()[0];
    }
  } else {
    console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT env var not found. Admin features (create user) will fail.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

// Middleware
app.use(express.json());

// --- BUILD PROCESS ---
let appStatus = 'INITIALIZING';
const buildLogs = [];

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe', shell: true });
    process.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        // console.log(msg); // Optional: keep logs clean
        buildLogs.push(msg);
      }
    });
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error('Command failed')));
  });
};

const startBuildProcess = async () => {
  if (appStatus === 'BUILDING') return;
  try {
    appStatus = 'BUILDING';
    console.log('Starting build process...');
    await runCommand('npm', ['install', '--no-package-lock', '--loglevel=error']);
    await runCommand('npm', ['run', 'build']);
    appStatus = 'READY';
    console.log('Build complete. App is ready.');
  } catch (error) {
    console.error('Build failed:', error);
    appStatus = 'ERROR';
  }
};

// --- API ROUTES ---

// Endpoint para promover candidato (Criar Usuário no Auth + Retornar UID)
app.post('/api/admin/promote', async (req, res) => {
  if (!adminApp) {
    return res.status(500).json({ error: 'Servidor não configurado com Chave de Serviço (Admin SDK).' });
  }

  const { idToken, email, name } = req.body;

  try {
    // 1. Verificar se quem está pedindo é um usuário válido (Segurança Básica)
    await getAuth().verifyIdToken(idToken);

    // 2. Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";

    // 3. Criar usuário no Firebase Auth
    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: true, // Já aprovado pela comissão, então validamos
      password: tempPassword,
      displayName: name,
      disabled: false,
    });

    console.log(`Successfully created new user: ${userRecord.uid}`);

    // 4. Retornar dados para o frontend finalizar o cadastro no Firestore
    res.json({ 
      uid: userRecord.uid,
      tempPassword: tempPassword
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar usuário.' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- STATIC FILES SERVING ---

// Middleware to intercept serving logic based on app status
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) return next(); // API passes through

  if (appStatus !== 'READY') {
    res.type('html');
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="3"></head><body style="background:#000;color:#e5e5e5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div><h1>Iniciando Sistema...</h1><p>Status: ${appStatus}</p><p>Aguarde, a página recarregará automaticamente.</p></div></body></html>`);
  }
  next();
});

// Serve static assets with correct caching
app.use(express.static(BUILD_PATH, {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Fallback for SPA (React Router)
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  
  const indexHtml = path.join(BUILD_PATH, 'index.html');
  res.sendFile(indexHtml, (err) => {
      if (err) {
        res.status(500).send("Error loading application.");
      }
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  setTimeout(startBuildProcess, 1000);
});
