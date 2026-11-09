// Adaptador somente da ferramenta de build. Capacitor 6 usa import default de
// tar; tar 7 corrigido expõe namespace ESM sem esse default no require().
// Não altera o extrator, a aplicação web, os plugins nem o projeto nativo.
// cap sync também precisa da máscara privada quando chamado fora do preparador.
process.umask(0o077);
const tar = require('tar');
if (tar.default === undefined) Object.defineProperty(tar, 'default', { value: tar });
