const ex = require("express");
const srv = ex();
const ax = require("axios");
const os = require('os');
const io = require("fs");
const pt = require("path");
const { promisify } = require('util');
const runCmd = promisify(require('child_process').exec);

// ========== 1. 变量定义 ==========
const U_URL = process.env.UPLOAD_URL || '';
const P_URL = process.env.PROJECT_URL || '';
const A_ACC = process.env.AUTO_ACCESS || false;
const WORK_DIR = process.env.FILE_PATH || './tmp';
const SUB_ROUTE = process.env.SUB_PATH || 'qianxiuadmin';
const S_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const uid = process.env.UUID || 'dc6f1e49-59fe-424b-8821-c61ebff31d0d';

// 哪吒相关
const nzHost = process.env.NEZHA_SERVER || '';
const nzPort = process.env.NEZHA_PORT || '';
const nzKey = process.env.NEZHA_KEY || '';

// Argo 相关
const tDom = process.env.ARGO_DOMAIN || '';
const tAuth = process.env.ARGO_AUTH || '';
const tPort = process.env.ARGO_PORT || 8012;

// 节点信息
const cfIp = process.env.CFIP || 'cdns.doon.eu.org';
const cfPort = process.env.CFPORT || 443;
const nName = process.env.NAME || 'MyNode|印度尼西亚';

let gSub = "";

// ========== 2. 页面内容 (美化版 - 极简仪表盘) ==========
const DEF_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Dashboard - System Status</title>
    <style>
        :root {
            --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --accent: #38bdf8;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
            background: var(--bg-gradient);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-main);
            padding: 20px;
        }
        .container {
            width: 100%;
            max-width: 800px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        header { text-align: center; margin-bottom: 40px; }
        h1 { font-weight: 200; letter-spacing: 4px; font-size: 1.8rem; margin-bottom: 10px; text-transform: uppercase; }
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 16px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 99px;
            color: #34d399;
            font-size: 0.85rem;
            margin-top: 10px;
        }
        .dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px #34d399; }
        
        .search-wrap { position: relative; margin-bottom: 40px; max-width: 500px; margin-left: auto; margin-right: auto; }
        input {
            width: 100%;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }
        input:focus { border-color: var(--accent); background: rgba(0, 0, 0, 0.4); box-shadow: 0 0 20px rgba(56, 189, 248, 0.1); }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; }
        .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-border);
            padding: 20px;
            border-radius: 16px;
            text-align: center;
            text-decoration: none;
            color: var(--text-sub);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        .card:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.08); color: var(--text-main); border-color: var(--accent); }
        .card-icon { font-size: 24px; margin-bottom: 5px; }
        .card-name { font-size: 0.9rem; font-weight: 500; }
        
        footer { margin-top: 50px; text-align: center; color: var(--text-sub); font-size: 0.75rem; border-top: 1px solid var(--glass-border); padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>System Nexus</h1>
            <div class="status-badge"><span class="dot"></span>Nodes Operational</div>
        </header>

        <div class="search-wrap">
            <form action="https://www.google.com/search" target="_blank">
                <input type="text" name="q" placeholder="Explore / Search..." autocomplete="off">
            </form>
        </div>

        <div class="grid">
            <a href="https://github.com" target="_blank" class="card">
                <span class="card-icon">📦</span>
                <span class="card-name">Resources</span>
            </a>
            <a href="https://chatgpt.com" target="_blank" class="card">
                <span class="card-icon">🧠</span>
                <span class="card-name">AI Core</span>
            </a>
            <a href="https://youtube.com" target="_blank" class="card">
                <span class="card-icon">▶️</span>
                <span class="card-name">Media</span>
            </a>
            <a href="https://speedtest.net" target="_blank" class="card">
                <span class="card-icon">⚡</span>
                <span class="card-name">Diagnostics</span>
            </a>
        </div>

        <footer>
            <p>System ID: ${uid.split('-')[0].toUpperCase()} • Encrypted Connection</p>
            <p style="margin-top:5px; opacity:0.5;">${new Date().getFullYear()} © Cloud Infrastructure</p>
        </footer>
    </div>
</body>
</html>
`;

// ========== 3. 文件系统初始化 ==========
if (!io.existsSync(WORK_DIR)) io.mkdirSync(WORK_DIR);

function rndStr() {
    return Math.random().toString(36).substring(2, 8);
}

const bin1 = rndStr(), bin2 = rndStr(), bin3 = rndStr(), bin4 = rndStr();
const p_npm = pt.join(WORK_DIR, bin1), p_php = pt.join(WORK_DIR, bin4);
const p_web = pt.join(WORK_DIR, bin2), p_bot = pt.join(WORK_DIR, bin3);
const logF = pt.join(WORK_DIR, 'boot.log'), confF = pt.join(WORK_DIR, 'config.json'), subF = pt.join(WORK_DIR, 'sub.txt');

// ========== 4. 路由与伪装路径 ==========
srv.get("/", (req, res) => res.send(DEF_PAGE));

srv.get("/" + SUB_ROUTE, (req, res) => {
    if (!gSub) {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        return res.send(Buffer.from("Init...").toString('base64'));
    }
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(gSub);
});

// ========== 5. 核心逻辑 ==========
const P_VL = "/api/auth";     
const P_VM = "/api/chat";     
const P_TR = "/api/image";    

async function mkConf() {
    const c = {
        log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
        inbounds: [
            { port: tPort, protocol: 'vless', settings: { clients: [{ id: uid, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: P_VL, dest: 3002 }, { path: P_VM, dest: 3003 }, { path: P_TR, dest: 3004 }] }, streamSettings: { network: 'tcp' } },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: uid }], decryption: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: uid, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", wsSettings: { path: P_VL } } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: uid, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: P_VM } } },
            { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: uid }] }, streamSettings: { network: "ws", wsSettings: { path: P_TR } } },
        ],
        outbounds: [{ protocol: "freedom", tag: "direct" }]
    };
    io.writeFileSync(confF, JSON.stringify(c, null, 2));
}

async function sysInit() {
    const arch = (os.arch() === 'arm64' || os.arch() === 'aarch64') ? 'arm' : 'amd';
    const dBase = "https://" + (arch === 'arm' ? "arm64" : "amd64") + ".ssss.nyc.mn";
    
    const list = [
        { dest: p_web, uri: `${dBase}/web` },
        { dest: p_bot, uri: `${dBase}/bot` }
    ];

    if (nzHost && nzKey) {
        if (nzPort) list.push({ dest: p_npm, uri: `${dBase}/agent` });
        else list.push({ dest: p_php, uri: `${dBase}/v1` });
    }

    for (const item of list) {
        try {
            const rsp = await ax({ method: 'get', url: item.uri, responseType: 'stream' });
            const w = io.createWriteStream(item.dest);
            rsp.data.pipe(w);
            await new Promise((r) => w.on('finish', r));
            io.chmodSync(item.dest, 0o775);
        } catch (e) { }
    }

    if (nzHost && nzKey) {
        if (!nzPort) {
            const isTls = ['443', '8443', '2096'].includes(nzHost.split(':').pop()) ? 'true' : 'false';
            const yml = `client_secret: ${nzKey}\nserver: ${nzHost}\ntls: ${isTls}\nuuid: ${uid}\ndisable_auto_update: true`;
            io.writeFileSync(pt.join(WORK_DIR, 'config.yaml'), yml);
            runCmd(`nohup ${p_php} -c "${WORK_DIR}/config.yaml" >/dev/null 2>&1 &`);
        } else {
            const tlsF = ['443', '8443', '2096'].includes(nzPort) ? '--tls' : '';
            runCmd(`nohup ${p_npm} -s ${nzHost}:${nzPort} -p ${nzKey} ${tlsF} --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`);
        }
    }

    runCmd(`nohup ${p_web} -c ${confF} >/dev/null 2>&1 &`);

    let tArgs = tAuth.match(/^[A-Z0-9a-z=]{120,250}$/)
        ? `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${tAuth}`
        : `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${logF} --loglevel info --url http://localhost:${tPort}`;
    
    runCmd(`nohup ${p_bot} ${tArgs} >/dev/null 2>&1 &`);
}

async function checkNet() {
    const timer = setInterval(() => {
        if (io.existsSync(logF)) {
            const txt = io.readFileSync(logF, 'utf-8');
            const m = txt.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
            if (m) {
                clearInterval(timer);
                makeLink(m[1]);
            }
        } else if (tDom && tAuth) {
            clearInterval(timer);
            makeLink(tDom);
        }
    }, 3000);
}

async function makeLink(host) {
    const safeName = nName || "CF-Node";
    const vJson = { v: '2', ps: safeName, add: cfIp, port: cfPort, id: uid, aid: '0', scy: 'none', net: 'ws', type: 'none', host: host, path: `${P_VM}?ed=2560`, tls: 'tls', sni: host, fp: 'firefox' };
    
    const s1 = `vless://${uid}@${cfIp}:${cfPort}?encryption=none&security=tls&sni=${host}&fp=firefox&type=ws&host=${host}&path=${encodeURIComponent(P_VL+"?ed=2560")}#${safeName}`;
    const s2 = `vmess://${Buffer.from(JSON.stringify(vJson)).toString('base64')}`;
    const s3 = `trojan://${uid}@${cfIp}:${cfPort}?security=tls&sni=${host}&fp=firefox&type=ws&host=${host}&path=${encodeURIComponent(P_TR+"?ed=2560")}#${safeName}`;

    const raw = `${s1}\n${s2}\n${s3}`;
    gSub = Buffer.from(raw).toString('base64');
    io.writeFileSync(subF, gSub);
    console.log("Ready.");
}

function wipe() {
    setTimeout(() => {
        [logF, confF, p_web, p_bot, p_npm, p_php].forEach(f => { 
            try { if (io.existsSync(f)) io.unlinkSync(f); } catch (e) {} 
        });
    }, 90000);
}

async function main() {
    await mkConf();
    await sysInit();
    await checkNet();
    wipe();
}

main().catch(() => {});
srv.listen(S_PORT, () => console.log(`:${S_PORT}`));
