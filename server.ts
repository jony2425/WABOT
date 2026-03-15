import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = 'whatsapp-saas-secret-key-123';
const PORT = 3000;

const app = express();
app.use(express.json());
app.use(cookieParser());

// Simple In-Memory DB (In a real app, use MongoDB as requested)
const db = {
  users: [] as any[], // { id, email, password, rules: [], menu: {}, bookings: [] }
  sessions: new Map<string, any>(), // userId -> { socket, qr, status }
  messages: [] as any[], // { userId, from, text, timestamp, direction }
  userStates: new Map<string, any>(), // jid -> { userId, step, menuPath: [] }
};

// Ensure sessions directory exists
if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

// --- WhatsApp Logic ---
async function connectToWhatsApp(userId: string) {
  const sessionDir = `./sessions/${userId}`;
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
  });

  db.sessions.set(userId, { sock, qr: null, status: 'connecting' });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const session = db.sessions.get(userId);
    
    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      db.sessions.set(userId, { ...session, qr: qrDataUrl, status: 'qr' });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      db.sessions.set(userId, { ...session, status: 'disconnected', qr: null });
      if (shouldReconnect) connectToWhatsApp(userId);
    } else if (connection === 'open') {
      db.sessions.set(userId, { ...session, status: 'connected', qr: null });
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
    const from = msg.key.remoteJid!;
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    // Store message for Team Inbox
    db.messages.push({ userId, from, text, timestamp: Date.now(), direction: 'in' });

    const stateKey = `${userId}_${from}`;
    const userState = db.userStates.get(stateKey);

    // Helper to find nested menu
    const getMenuByPath = (menu: any, path: string[]) => {
      let current = menu;
      for (const segment of path) {
        const option = current.options?.find((o: any) => o.id === segment);
        if (option && option.action === 'submenu') {
          current = option.submenu;
        } else {
          return null;
        }
      }
      return current;
    };

    // Helper to format menu text
    const formatMenuText = (menu: any) => {
      let text = `*${menu.welcomeText || 'Welcome'}*\n\n`;
      const options = menu.options || [];
      options.forEach((opt: any) => {
        text += `${opt.trigger}️⃣ ${opt.label}\n`;
      });
      text += `\n_Reply with the number to choose_`;
      return text;
    };

    console.log(`[WA] Message from ${from}: ${text}`);

    // 1. Menu Chatbot Logic (Triggers)
    const menuConfig = user.menu || { enabled: false };
    const customTrigger = (menuConfig.triggerKeyword || 'menu').toLowerCase();
    const defaultTriggers = ['hi', 'hello', 'hey', 'start'];
    if (menuConfig.enabled && (text.toLowerCase() === customTrigger || defaultTriggers.includes(text.toLowerCase()))) {
      db.userStates.set(stateKey, { userId, step: 'menu', menuPath: [] });
      await sock.sendMessage(from, { text: formatMenuText(menuConfig) });
      return;
    }

    // 2. Menu Interaction Logic
    if (userState?.step === 'menu') {
      const currentMenu = getMenuByPath(menuConfig, userState.menuPath);
      if (currentMenu && currentMenu.options) {
        const selectedOption = currentMenu.options.find((o: any) => o.trigger === text);
        if (selectedOption) {
          switch (selectedOption.action) {
            case 'text':
            case 'info':
            case 'support':
              await sock.sendMessage(from, { text: selectedOption.replyText || "Thank you for your message." });
              db.userStates.delete(stateKey);
              break;
            case 'booking':
              db.userStates.set(stateKey, { userId, step: 'booking_date' });
              await sock.sendMessage(from, { text: "Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday" });
              break;
            case 'submenu':
              const newPath = [...userState.menuPath, selectedOption.id];
              db.userStates.set(stateKey, { ...userState, menuPath: newPath });
              await sock.sendMessage(from, { text: formatMenuText(selectedOption.submenu) });
              break;
          }
          return;
        } else {
          await sock.sendMessage(from, { text: "Invalid option. Please reply with one of the numbers above." });
          return;
        }
      }
    }

    // 3. Booking Flow Logic (Legacy/Fallback)
    if (text.toLowerCase() === 'book') {
      db.userStates.set(stateKey, { userId, step: 'booking_date' });
      await sock.sendMessage(from, { text: "Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday" });
      return;
    }

    if (userState?.step === 'booking_date') {
      const dates: any = { '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday' };
      if (dates[text]) {
        db.userStates.set(stateKey, { ...userState, step: 'booking_time', date: dates[text] });
        await sock.sendMessage(from, { text: `Great! You selected ${dates[text]}. Now select a time:\n1️⃣ 10:00 AM\n2️⃣ 02:00 PM\n3️⃣ 04:00 PM` });
      } else {
        await sock.sendMessage(from, { text: "Invalid option. Please reply with 1, 2, or 3." });
      }
      return;
    }

    if (userState?.step === 'booking_time') {
      const times: any = { '1': '10:00 AM', '2': '02:00 PM', '3': '04:00 PM' };
      if (times[text]) {
        const booking = {
          id: Date.now().toString(),
          customerPhone: from,
          date: userState.date,
          time: times[text],
          userId: userId,
          timestamp: new Date().toISOString()
        };
        user.bookings = user.bookings || [];
        user.bookings.push(booking);
        db.userStates.delete(stateKey);
        await sock.sendMessage(from, { text: `✅ Booking Confirmed!\nDate: ${booking.date}\nTime: ${booking.time}\nWe will see you then!` });
      } else {
        await sock.sendMessage(from, { text: "Invalid option. Please reply with 1, 2, or 3." });
      }
      return;
    }

    // 4. Keyword Auto Reply Logic
    if (user.rules) {
      for (const rule of user.rules) {
        const keyword = rule.keyword.trim().toLowerCase();
        if (text.toLowerCase() === keyword || text.toLowerCase().includes(keyword)) {
          await sock.sendMessage(from, { text: rule.reply });
          return;
        }
      }
    }
  });
}

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User not found' });
    }
    req.userId = decoded.userId;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- API Routes ---
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { 
    id: Date.now().toString(), 
    email, 
    password: hashedPassword, 
    rules: [], 
    menu: { 
      enabled: true, 
      triggerKeyword: 'menu',
      welcomeText: "Welcome to our Business 👋\nHow can we help you today?", 
      options: [
        { id: '1', trigger: '1', label: 'Book Appointment', action: 'booking' },
        { id: '2', trigger: '2', label: 'Price List', action: 'text', replyText: 'Our prices start from $20. Visit our website for more.' },
        { id: '3', trigger: '3', label: 'Support', action: 'support', replyText: 'A human agent will be with you shortly.' }
      ] 
    },
    bookings: []
  };
  db.users.push(user);
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ success: true, user: { email: user.email } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', authenticate, (req: any, res) => {
  const user = db.users.find(u => u.id === req.userId);
  res.json({ email: user.email, rules: user.rules, menu: user.menu, bookings: user.bookings });
});

app.get('/api/whatsapp/status', authenticate, (req: any, res) => {
  const session = db.sessions.get(req.userId);
  if (!session) {
    connectToWhatsApp(req.userId);
    return res.json({ status: 'connecting' });
  }
  res.json({ status: session.status, qr: session.qr });
});

// Rules
app.post('/api/rules', authenticate, (req: any, res) => {
  const { keyword, reply } = req.body;
  const user = db.users.find(u => u.id === req.userId);
  user.rules.push({ id: Date.now().toString(), keyword, reply });
  res.json({ success: true, rules: user.rules });
});

app.delete('/api/rules/:id', authenticate, (req: any, res) => {
  const user = db.users.find(u => u.id === req.userId);
  user.rules = user.rules.filter((r: any) => r.id !== req.params.id);
  res.json({ success: true, rules: user.rules });
});

// Menu
app.post('/api/menu', authenticate, (req: any, res) => {
  const menuConfig = req.body;
  const user = db.users.find(u => u.id === req.userId);
  user.menu = menuConfig;
  res.json({ success: true, menu: user.menu });
});

// Bookings
app.get('/api/bookings', authenticate, (req: any, res) => {
  const user = db.users.find(u => u.id === req.userId);
  res.json(user.bookings || []);
});

// Broadcast
app.post('/api/broadcast', authenticate, async (req: any, res) => {
  const { message, contacts } = req.body; // contacts is array of JIDs
  const session = db.sessions.get(req.userId);
  if (!session || session.status !== 'connected') return res.status(400).json({ error: 'WhatsApp not connected' });

  for (const jid of contacts) {
    await session.sock.sendMessage(jid, { text: message });
  }
  res.json({ success: true });
});

// Team Inbox
app.get('/api/messages', authenticate, (req: any, res) => {
  const messages = db.messages.filter(m => m.userId === req.userId);
  res.json(messages);
});

app.post('/api/messages/reply', authenticate, async (req: any, res) => {
  const { to, text } = req.body;
  const session = db.sessions.get(req.userId);
  if (!session || session.status !== 'connected') return res.status(400).json({ error: 'WhatsApp not connected' });

  await session.sock.sendMessage(to, { text });
  db.messages.push({ userId: req.userId, from: to, text, timestamp: Date.now(), direction: 'out' });
  res.json({ success: true });
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
