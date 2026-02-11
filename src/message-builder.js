import { formatIdNumber, getStatus, calcProfit, formatTanggalIndo } from './utils.js';
import { config } from './config.js';

export function buildMessage({ newBuy, newSell, oldBuy, updatedAt, xauUsd, usdIdr, customMessage }) {
  const status = getStatus(newBuy, oldBuy);
  const tanggal = formatTanggalIndo(updatedAt);
  const spreadRaw = (newSell - newBuy) / newBuy * 100;
  const spreadSign = spreadRaw >= 0 ? '+' : '';
  const spreadPct = `${spreadSign}${spreadRaw.toFixed(2).replace('.', ',')}%`;

  const parts = [
    '*', status, '*\n',
    '*', tanggal, '*\n\n',
    'Beli: ', formatIdNumber(newBuy), ' Jual: ', formatIdNumber(newSell), ' *(', spreadPct, ')*\n\n',
  ];

  for (const [nominal, modal] of config.nominals) {
    const { gram, selisih, emoji, sign } = calcProfit(nominal, modal, newBuy, newSell);
    parts.push(
      `🥇 ${(nominal / 1_000_000).toFixed(0)} JT ➺ ${gram.toFixed(4)}gr ${emoji} *${sign}Rp ${formatIdNumber(selisih)}*\n`
    );
  }

  const xauStr = xauUsd != null ? formatIdNumber(xauUsd, 3) : 'N/A';
  const usdStr = usdIdr != null ? formatIdNumber(usdIdr, 4) : 'N/A';
  parts.push(`\nHarga XAU: *${xauStr}* *|* USD: *${usdStr}*`);

  if (customMessage) {
    parts.push(`\n\n*${customMessage}*`);
  }

  return parts.join('');
}


