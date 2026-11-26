// 4.9 · dados dos 51 lotes para os testes: o mesmo arquivo que entra no app (src/dados/lotes.json).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function loadFields() { return JSON.parse(await readFile(root + 'src/dados/lotes.json', 'utf8')).fields; }
