// Configuración inicial para XAMPP local. Nunca reemplaza archivos existentes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = {
  'backend/.env': `NODE_ENV=development\nPORT=3001\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_NAME=forbook_final_prueba\nDB_USER=root\nDB_PASSWORD=\nSESSION_SECRET=${crypto.randomBytes(48).toString('base64url')}\nSESSION_TTL_HOURS=24\nFRONTEND_URL=http://localhost:5173\nTRUST_PROXY=false\n`,
  'frontend/.env': 'VITE_API_URL=http://localhost:3001/api\n',
};
for (const [relative, content] of Object.entries(files)) {
  try {
    fs.writeFileSync(path.join(root, relative), content, { flag: 'wx' });
    console.log(`Creado ${relative}.`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Se conserva ${relative}: ya existe.`);
  }
}
console.log('Configuración local lista. Seguí INICIAR.md para crear la base y ejecutar los servidores.');
