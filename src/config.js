import dotenv from 'dotenv';
dotenv.config();

export const config = {
  waTargetJid: process.env.WA_TARGET_JID || '6281234567890@s.whatsapp.net',
  oandaToken: process.env.OANDA_ACCESS_TOKEN || '',
  oandaAccountId: process.env.OANDA_ACCOUNT_ID || '',
  oandaEnv: process.env.OANDA_ENVIRONMENT || 'practice',
  treasuryWsUrl: 'wss://ws-ap1.pusher.com/app/52e99bd2c3c42e577e13?protocol=7&client=js&version=7.0.3&flash=false',
  treasuryChannel: 'gold-rate',
  treasuryEvent: 'gold-rate-event',
  googleFxUrl: 'https://www.google.com/finance/quote/USD-IDR',
  nominals: JSON.parse(
    process.env.NOMINALS ||
    '[[10000000,9669000],[20000000,19330000],[30000000,28995000],[40000000,38660000],[50000000,48325000]]'
  ),
  marketDataIntervalMs: 5000,
  reconnectDelayMs: 5000,
  pusherPingIntervalMs: 120000,
};