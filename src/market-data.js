import axios from 'axios';
import https from 'https';
import { config } from './config.js';

let cachedXauUsd = null;
let cachedUsdIdr = null;
let intervalHandle = null;

const oandaAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

async function fetchXauUsd() {
  if (!config.oandaToken || !config.oandaAccountId) return;
  const baseUrl = config.oandaEnv === 'live'
    ? 'https://api-fxtrade.oanda.com'
    : 'https://api-fxpractice.oanda.com';
  try {
    const { data } = await axios.get(
      `${baseUrl}/v3/accounts/${config.oandaAccountId}/pricing`,
      {
        params: { instruments: 'XAU_USD' },
        headers: { Authorization: `Bearer ${config.oandaToken}` },
        timeout: 15000,
        httpsAgent: oandaAgent,
      }
    );
    if (data.prices && data.prices.length > 0) {
      const p = data.prices[0];
      cachedXauUsd = (parseFloat(p.bids[0].price) + parseFloat(p.asks[0].price)) / 2;
    }
  } catch {}
}

async function fetchUsdIdr() {
  try {
    const { data } = await axios.get(config.googleFxUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });
    const match = data.match(/data-last-price="([0-9.,]+)"/);
    if (match) {
      cachedUsdIdr = parseFloat(match[1].replace(',', ''));
    }
  } catch {}
}

async function fetchAll() {
  await Promise.allSettled([fetchXauUsd(), fetchUsdIdr()]);
}

export function startMarketData() {
  fetchAll();
  intervalHandle = setInterval(fetchAll, config.marketDataIntervalMs);
}

export function stopMarketData() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}

export function getXauUsd() { return cachedXauUsd; }
export function getUsdIdr() { return cachedUsdIdr; }