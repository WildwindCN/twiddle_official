# TwiddleSEED 官方站 — 部署说明 (ECS volce)

主域 `twiddle-ai.com.cn`,直连阿里云火山引擎 ECS (`14.103.86.179`, SSH alias `gilmour`)。
部署约定仿 latent-space 现在的 `ecs-volce` 模式(参考 `boss-pipeline/CLAUDE.md`):

- **GitHub = 中心**: `git@github.com:WildwindCN/twiddle_official.git`,所有 push 走这里
- **Mac mirror**: `~/Developer/deployed-services/ecs-volce-14.103.86.179/twiddle_official/`
- **ECS 部署点**: `14.103.86.179:/opt/twiddle_official`,也是 git 仓库;只 pull,不在服务器 commit

## 服务组成

| 进程 | 端口 | 启动方式 | 角色 |
|---|---|---|---|
| nginx | 80/443 | systemd | HTTPS 终止 + 静态 + `/api/*` 反代 |
| `twiddle-official-waitlist` | 127.0.0.1:8791 | systemd,Node stdlib | waitlist 收集 + Resend 邮件 |

## 一次性安装 (服务器)

```bash
# 1. 拉代码
ssh gilmour
git clone git@github.com:WildwindCN/twiddle_official.git /opt/twiddle_official
cd /opt/twiddle_official && git checkout main

# 2. 准备 web 目录 (nginx 直接 serve 仓库根, 不需要单独 web/ 拷贝)
#    index.html / css/ / js/ / images/ / favicon/ 都在仓库根,
#    functions/ ecs-api/ deploy/ nginx/ DEPLOY.md .git/ 由 nginx deny 掉.

# 3. 装 waitlist 后端
cp ecs-api/.env.example /opt/twiddle_official/ecs-api/.env
chmod 600 /opt/twiddle_official/ecs-api/.env
$EDITOR /opt/twiddle_official/ecs-api/.env   # 填 RESEND_API_KEY
mkdir -p /opt/twiddle_official/data && chmod 700 /opt/twiddle_official/data

cp deploy/twiddle-official-waitlist.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now twiddle-official-waitlist.service
systemctl status twiddle-official-waitlist.service --no-pager
curl http://127.0.0.1:8791/api/healthz   # → {"ok":true,...}

# 4. nginx 站点配置
cp nginx/twiddle-ai.com.cn.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 5. TLS 证书 (跟 qr / latentspace 共用 certbot dns-cloudflare 流程)
apt install -y certbot python3-certbot-dns-cloudflare
# /root/.secrets/cf.ini 已经存在 (qr 和 latentspace 在用)
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cf.ini \
  --dns-cloudflare-propagation-seconds 35 \
  -d twiddle-ai.com.cn -d www.twiddle-ai.com.cn \
  --key-type ecdsa --agree-tos --non-interactive \
  -m zhangjiangnan@shanda.com

# 6. DNS A 记录 (在 Cloudflare DNS 面板, twiddle-ai.com.cn 这个 zone)
#    twiddle-ai.com.cn        A    14.103.86.179   (灰色云, 不要开 proxy)
#    www.twiddle-ai.com.cn    A    14.103.86.179
```

## 日常更新

```bash
# Mac mirror 改完代码后:
git push origin main

# 服务器:
ssh gilmour
cd /opt/twiddle_official
git pull
systemctl reload twiddle-official-waitlist.service   # 如果 ecs-api 改了
nginx -t && systemctl reload nginx                   # 如果 nginx 配置改了
```

## API 路由

- `POST /api/waitlist` body `{"contact": "user@example.com", "lang": "zh"}` →
  `{ok, id, contact, duplicate?}`
- `GET /api/waitlist` → 最近 20 条 (`{items: [{id, contact, type, ts, ua}]}`)
- `GET /api/healthz` → 进程存活 + entries 数
- `GET /api/lang` → 404 (ECS 无 GeoIP, 前端走 navigator.language 兜底)

## 跟 Cloudflare Pages 那一版的关系

仓库里 `functions/api/*.js` 是早期 Cloudflare Pages 部署用的,继续保留用于回滚或
Cloudflare Pages 重启。`ecs-api/server.mjs` 是 ECS 部署的官方实现,功能对齐
(`isEmail` / `isPhone` / rate limit / dedupe / Resend 邮件模板与原版一致),
只把 KV 换成 JSON 文件,GeoIP 检测(`/api/lang`)在 ECS 这边不接,前端会自动兜底。

## 资源占用

- Node 进程:常驻 ~30 MB RSS(无 native 模块)
- 磁盘:JSON 文件按 1000 条上限,几百 KB
- ECS 总体 3.8 GB RAM / 4 CPU,本服务占不到 1%
