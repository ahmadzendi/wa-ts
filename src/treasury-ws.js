import WebSocket from 'ws';
import { config } from './config.js';

let ws = null;
let pingInterval = null;
let isConnected = false;
let onPriceUpdateCallback = null;

export function setOnPriceUpdate(cb) { onPriceUpdateCallback = cb; }
export function isTreasuryConnected() { return isConnected; }

// ═══ FIX: Parse harga format Indonesia "2.853.466" → 2853466 ═══
function parseIndonesianNumber(str) {
  if (str == null) return NaN;
  const s = String(str).trim();

  // Cek apakah format Indonesia: "2.853.466" (titik sebagai ribuan)
  // Atau format biasa: "2853466" atau "2853.466" (titik sebagai desimal)

  // Hitung jumlah titik
  const dots = (s.match(/\./g) || []).length;

  if (dots >= 2) {
    // Format Indonesia: "2.853.466" → hapus semua titik
    return parseFloat(s.replace(/\./g, ''));
  }

  if (dots === 1) {
    // Cek apakah setelah titik ada 3 digit (ribuan) atau tidak (desimal)
    const afterDot = s.split('.')[1];
    if (afterDot && afterDot.length === 3 && parseFloat(s.replace('.', '')) > 1000) {
      // Kemungkinan ribuan: "853.466" → 853466
      return parseFloat(s.replace('.', ''));
    }
    // Desimal biasa: "2853.50"
    return parseFloat(s);
  }

  // Tanpa titik: "2853466"
  return parseFloat(s);
}

export function connectTreasury() {
  console.log('🔌 Connecting to Treasury WebSocket...');
  ws = new WebSocket(config.treasuryWsUrl);

  ws.on('open', () => {
    console.log('✅ Treasury WebSocket connected');
    isConnected = true;
    ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: config.treasuryChannel } }));
    console.log(`📡 Subscribed: ${config.treasuryChannel}`);
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, config.pusherPingIntervalMs);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event === 'pusher:connection_established') {
        console.log('🤝 Pusher handshake OK');
      } else if (msg.event === 'pusher_internal:subscription_succeeded') {
        console.log(`✅ Subscription confirmed: ${msg.channel}`);
      } else if (msg.event === config.treasuryEvent) {
        const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;

        const buyRaw = data.buying_rate;
        const sellRaw = data.selling_rate;
        const buyParsed = parseIndonesianNumber(buyRaw);
        const sellParsed = parseIndonesianNumber(sellRaw);

        console.log(`💰 Buy=${buyRaw} (${buyParsed}) Sell=${sellRaw} (${sellParsed}) at ${data.created_at || data.updated_at}`);

        if (isNaN(buyParsed) || isNaN(sellParsed)) {
          console.error(`❌ Gagal parse harga: buy="${buyRaw}" sell="${sellRaw}"`);
          return;
        }

        if (onPriceUpdateCallback) {
          onPriceUpdateCallback({
            buyingRate: buyParsed,
            sellingRate: sellParsed,
            updatedAt: data.created_at || data.updated_at || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('❌ Parse error:', err.message);
    }
  });

  ws.on('error', (err) => { console.error('❌ Treasury WS error:', err.message); });

  ws.on('close', (code) => {
    isConnected = false;
    console.log(`🔌 Treasury WS closed (${code}). Reconnecting...`);
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
    setTimeout(connectTreasury, config.reconnectDelayMs);
  });
}

export function disconnectTreasury() {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
  if (ws) { ws.close(); ws = null; }
}