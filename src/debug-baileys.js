import baileys from '@whiskeysockets/baileys';

console.log('Type:', typeof baileys);
console.log('Keys:', Object.keys(baileys));

if (baileys.default) {
  console.log('default type:', typeof baileys.default);
  if (typeof baileys.default === 'object') {
    console.log('default keys:', Object.keys(baileys.default));
  }
}
