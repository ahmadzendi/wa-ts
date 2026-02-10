import baileys from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { config } from './config.js';

// Auto-detect export structure
const makeWASocket = baileys.default || baileys.makeWASocket || baileys;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
const fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
const DisconnectReason = baileys.DisconnectReason;

const logger = pino({ level: 'silent' });

let sock = null;
let isConnected = false;
let customMessage = '';
let onCommandCallback = null;

export function setCommandCallback(cb) { onCommandCallback = cb; }
export function getCustomMessage() { return customMessage; }
export function isWaConnected() { return isConnected; }

export async function sendWhatsApp(text) {
  if (!sock || !isConnected) return false;
  try {
    await sock.sendMessage(config.waTargetJid, { text });
    return true;
  } catch {
    return false;
  }
}

export async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  let version;
  try {
    const vInfo = await fetchLatestBaileysVersion();
    version = vInfo.version;
  } catch {
    version = [2, 3000, 1015901307];
  }

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Treasury Bot', 'Chrome', '22.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n=== SCAN QR CODE ===\n');
      try {
        const qrText = await QRCode.toString(qr, { type: 'terminal', small: true });
        console.log(qrText);
      } catch {
        console.log('QR:', qr);
      }
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log('\nBuka link ini di browser lalu scan:');
      console.log(qrUrl);
      console.log('\n====================\n');
    }

    if (connection === 'open') {
      isConnected = true;
      console.log('WhatsApp terhubung!');
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut || statusCode === 405) {
        const fs = await import('fs');
        try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch {}
        setTimeout(connectWhatsApp, 3000);
        return;
      }

      setTimeout(connectWhatsApp, config.reconnectDelayMs);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text) continue;
      const from = msg.key.remoteJid;
      if (from !== config.waTargetJid) continue;

      if (text.startsWith('/atur ')) {
        customMessage = text.slice(6).trim();
        sock.sendMessage(from, { text: `Pesan custom diubah:\n"${customMessage}"` });
      }
      if (text === '/reset') {
        customMessage = '';
        sock.sendMessage(from, { text: 'Pesan custom dihapus' });
      }
      if (text === '/status' && onCommandCallback) {
        sock.sendMessage(from, { text: onCommandCallback('status') });
      }
      if (text === '/ping') {
        sock.sendMessage(from, { text: 'Pong!' });
      }
    }
  });

  return sock;
}
