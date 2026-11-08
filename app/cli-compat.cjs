// Adaptador somente da ferramenta de build. Capacitor 6 usa import default de
// tar; tar 7 corrigido expõe namespace ESM sem esse default no require().
// Não altera o extrator, a aplicação web, os plugins nem o projeto nativo.
const tar = require('tar');
if (tar.default === undefined) Object.defineProperty(tar, 'default', { value: tar });
