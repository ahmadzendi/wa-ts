const HARI_INDONESIA = {
  Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu',
  Thursday: 'Kamis', Friday: 'Jumat', Saturday: 'Sabtu', Sunday: 'Minggu',
};

const WIB_OFFSET = 7 * 60 * 60 * 1000;

export function nowWIB() {
  return new Date(Date.now() + WIB_OFFSET);
}

export function isWeekendQuiet() {
  const wib = nowWIB();
  const wd = wib.getUTCDay();
  const h = wib.getUTCHours();
  const m = wib.getUTCMinutes();
  if (wd === 6) return h > 5 || (h === 5 && m >= 5);
  if (wd === 0) return true;
  if (wd === 1) return h < 5 || (h === 5 && m <= 55);
  return false;
}

export function formatTanggalIndo(updatedAtStr) {
  try {
    const clean = updatedAtStr.split('+')[0].split('Z')[0];
    const dt = new Date(clean);
    if (isNaN(dt.getTime())) return updatedAtStr;
    const dayName = HARI_INDONESIA[dt.toLocaleDateString('en-US', { weekday: 'long' })] || dt.toLocaleDateString('en-US', { weekday: 'long' });
    const time = [
      String(dt.getHours()).padStart(2, '0'),
      String(dt.getMinutes()).padStart(2, '0'),
      String(dt.getSeconds()).padStart(2, '0'),
    ].join(':');
    return `${dayName} ${time}`;
  } catch {
    return updatedAtStr;
  }
}

export function formatIdNumber(number, decimalPlaces = 0) {
  if (number == null) return 'N/A';
  const num = parseFloat(number);
  const intPart = Math.floor(Math.abs(num));
  const formatted = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimalPlaces > 0) {
    const decPart = Math.abs(num).toFixed(decimalPlaces).split('.')[1];
    return `${num < 0 ? '-' : ''}${formatted},${decPart}`;
  }
  return `${num < 0 ? '-' : ''}${formatted}`;
}

export function getStatus(newPrice, oldPrice) {
  if (oldPrice == null) return 'Baru';
  const diff = newPrice - oldPrice;
  if (diff > 0) return `Naik 🚀 +${formatIdNumber(diff)} rupiah`;
  if (diff < 0) return `Turun 🔻 -${formatIdNumber(-diff)} rupiah`;
  return '━ Tetap';
}

export function calcProfit(nominal, modal, buy, sell) {
  const gram = nominal / buy;
  const selisih = gram * sell - modal;
  if (selisih >= 0) return { gram, selisih, emoji: '🟢', sign: '+' };
  return { gram, selisih: -selisih, emoji: '🔴', sign: '-' };
}