import baileys from '@whiskeysockets/baileys';

console.log('Type:', typeof baileys);
console.log('Keys:', Object.keys(baileys));

if (baileys.default) {
  console.log('default keys:', Object.keys(baileys.default));
}

// Cari useMultiFileAuthState di mana
function findKey(obj, name, depth = 0) {
  if (depth > 3) return;
  for (const key of Object.keys(obj)) {
    if (key === name) {
      console.log(`FOUND: ${name} at depth ${depth}, under key "${key}"`);
    }
    if (typeof obj[key] === 'object' && obj[key] !== null && depth < 3) {
      findKey(obj[key], name, depth + 1);
    }
  }
}

findKey(baileys, 'useMultiFileAuthState');
