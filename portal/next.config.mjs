import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export default { async headers(){return ["brand","body","golf","sports"].map(folder=>({source:`/${folder}/:path*`,headers:[{key:"Cache-Control",value:"public, max-age=3600, stale-while-revalidate=86400"}]}));}, turbopack: { root }, outputFileTracingRoot: root };
