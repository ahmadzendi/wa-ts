import fs from 'fs';

export function loadAuthFromEnv() {
  const credsData = process.env.WA_CREDS;
  if (!credsData) return;

  const dir = './auth_info';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const creds = Buffer.from(credsData, 'base64').toString();
    fs.writeFileSync('./auth_info/creds.json', creds);
    console.log('Creds loaded from env');
  } catch (err) {
    console.error('Creds load error:', err.message);
  }
}
