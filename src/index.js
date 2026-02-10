import { loadAuthFromEnv } from './auth-loader.js';
loadAuthFromEnv();
import { connectWhatsApp, sendWhatsApp, setCommandCallback, getCustomMessage, isWaConnected } from './whatsapp.js';
import { connectTreasury, setOnPriceUpdate, isTreasuryConnected } from './treasury-ws.js';
import { startMarketData, getXauUsd, getUsdIdr, stopMarketData } from './market-data.js';
import { buildMessage } from './message-builder.js';
import { isWeekendQuiet, formatIdNumber } from './utils.js';

let lastBuyPrice = null;
let lastUpdatedAt = null;
let totalUpdates = 0;
let startTime = Date.now();

console.log('Bot berjalan... Menunggu perubahan harga Treasury.');

// ═══ COMMAND /status ═══
setCommandCallback((command) => {
  if (command === 'status') {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    return [
      `⏱ Uptime: ${h}j ${m}m ${s}s`,
      `📡 Treasury WS: ${isTreasuryConnected() ? '✅' : '❌'}`,
      `📱 WhatsApp: ${isWaConnected() ? '✅' : '❌'}`,
      `📈 Total updates: ${totalUpdates}`,
      `💰 Harga terakhir: Rp ${lastBuyPrice ? formatIdNumber(lastBuyPrice) : 'N/A'}`,
      `🕐 Update terakhir: ${lastUpdatedAt || 'N/A'}`,
      `XAU: ${getXauUsd() ? formatIdNumber(getXauUsd(), 3) : 'N/A'}`,
      `USD: ${getUsdIdr() ? formatIdNumber(getUsdIdr(), 4) : 'N/A'}`,
      `🌙 Weekend quiet: ${isWeekendQuiet() ? 'Ya' : 'Tidak'}`,
    ].join('\n');
  }
  return '';
});

// ═══ HANDLER HARGA BARU DARI WEBSOCKET ═══
setOnPriceUpdate(({ buyingRate, sellingRate, updatedAt }) => {
  const newBuy = Math.round(buyingRate);
  const newSell = Math.round(sellingRate);

  if (lastUpdatedAt != null && updatedAt <= lastUpdatedAt) return;

  const priceChanged = lastBuyPrice == null || newBuy !== lastBuyPrice;

  if (isWeekendQuiet() && !priceChanged) {
    lastBuyPrice = newBuy;
    lastUpdatedAt = updatedAt;
    return;
  }

  const msg = buildMessage({
    newBuy,
    newSell,
    oldBuy: lastBuyPrice,
    updatedAt,
    xauUsd: getXauUsd(),
    usdIdr: getUsdIdr(),
    customMessage: getCustomMessage(),
  });

  // Fire-and-forget, tidak nunggu
  sendWhatsApp(msg).then(sent => { if (sent) totalUpdates++; });

  lastBuyPrice = newBuy;
  lastUpdatedAt = updatedAt;
});

// ═══ STARTUP ═══
async function start() {
  try {
    console.log('📱 Menghubungkan WhatsApp...');
    await connectWhatsApp();

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (isWaConnected()) { clearInterval(check); resolve(); }
      }, 1000);
      setTimeout(() => { clearInterval(check); resolve(); }, 60000);
    });

    startMarketData();
    connectTreasury();

    console.log('🚀 Bot aktif! Menunggu update harga dari WebSocket...\n');
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nBot dihentikan.');
  stopMarketData();
  const { disconnectTreasury } = await import('./treasury-ws.js');
  disconnectTreasury();
  setTimeout(() => process.exit(0), 2000);
});


start();
