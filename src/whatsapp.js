import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';

const logger = pino({ level: 'silent' });
const EPHEMERAL = 86400;

let sock = null;
let isConnected = false;
let customMessage = '';
let onCommandCallback = null;

export function setCommandCallback(cb) { onCommandCallback = cb; }
export function getCustomMessage() { return customMessage; }
export function isWaConnected() { return isConnected; }

export async function sendWhatsApp(text) {
  if (!sock || !isConnected) {
    console.log('⚠️  WhatsApp belum terhubung');
    return false;
  }
  try {
    await sock.sendMessage(
      config.waTargetJid,
      { text },
      { ephemeralExpiration: EPHEMERAL }
    );
    return true;
  } catch (err) {
    console.error('❌ Gagal kirim WA:', err.message);
    return false;
  }
}

export async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📌 WA Web version: ${version.join('.')} (latest: ${isLatest})`);

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
    keepAliveIntervalMs: 15000,
    connectTimeoutMs: 10000,
    retryRequestDelayMs: 250,
    fireInitQueries: false,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n═══════════════════════════════════');
      console.log('📱 Scan QR Code dengan WhatsApp:');
      console.log('   WhatsApp > Linked Devices > Link a Device');
      console.log('═══════════════════════════════════\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp terhubung!');
      console.log(`📤 Target: ${config.waTargetJid}`);
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message || 'unknown';
      console.log(`❌ WhatsApp terputus (${statusCode}: ${reason})`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🔑 Logged out. Hapus auth_info dan restart.');
        console.log('   Jalankan: rm -rf auth_info && npm start');
        return;
      }

      if (statusCode === 405) {
        console.log('🔄 Error 405 - menghapus session lama...');
        import('fs').then(fs => {
          try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch {}
          console.log('🔄 Session dihapus, reconnecting...');
          setTimeout(connectWhatsApp, 3000);
        });
        return;
      }

      console.log('🔄 Reconnecting in 5s...');
      setTimeout(connectWhatsApp, config.reconnectDelayMs);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      if (!text) continue;

      const from = msg.key.remoteJid;
      const trimmed = text.trim();

      console.log(`Pesan dari: ${from} | Isi: ${trimmed}`);

      if (trimmed === '/groupid') {
        sock.sendMessage(from, { text: `ID:\n${from}` }, { ephemeralExpiration: EPHEMERAL });
        continue;
      }

      if (trimmed.startsWith('/atur ')) {
        customMessage = trimmed.slice(6).trim();
        sock.sendMessage(from, { text: `Pesan custom diubah:\n"${customMessage}"` }, { ephemeralExpiration: EPHEMERAL });
      }
      if (trimmed === '/resetpesan') {
        customMessage = '';
        sock.sendMessage(from, { text: 'Pesan custom dihapus' }, { ephemeralExpiration: EPHEMERAL });
      }
    }
  });

  return sock;
}

