# number-store

一个最小的“输入数字 → 存到 Cloudflare Workers KV”的示例。

- 前端：`public/index.html`（静态页面）
- 后端：`functions/api/numbers.js`（Cloudflare Pages Functions，自动挂到 `/api/numbers`）
- 存储：Cloudflare Workers KV，绑定名为 `NUMBERS`

## 目录结构

```
number-store/
├── public/
│   └── index.html           # 前端页面
├── functions/
│   └── api/
│       └── numbers.js       # POST 写入 / GET 读取
└── README.md
```

## 本地调试

```bash
npm i -g wrangler
# 在项目根目录执行，--kv 会自动建一个本地模拟 KV 命名为 NUMBERS
wrangler pages dev public --kv NUMBERS
```

打开 http://localhost:8788 。

## 部署到 Cloudflare Pages（通过 GitHub）

1. **推到 GitHub**

   ```bash
   cd number-store
   git init
   git add .
   git commit -m "init: number store demo"
   git branch -M main
   git remote add origin git@github.com:<你的用户名>/number-store.git
   git push -u origin main
   ```

2. **在 Cloudflare Dashboard 创建 KV 命名空间**

   Workers & Pages → KV → Create a namespace → 名字随意，例如 `numbers-prod`。

3. **创建 Pages 项目**

   Workers & Pages → Create → Pages → Connect to Git → 选刚推的仓库。
   构建设置保持空即可（没有构建步骤）：
   - Build command：留空
   - Build output directory：`public`

4. **绑定 KV 到 Pages 项目**

   进入 Pages 项目 → Settings → Functions → **KV namespace bindings** → Add binding
   - Variable name: `NUMBERS`（必须叫这个，代码里用的是 `env.NUMBERS`）
   - KV namespace: 选上一步创建的 `numbers-prod`

   生产环境和预览环境都加一次。

5. **重新部署一次**

   在 Deployments 里点 Retry deployment，让新绑定生效。

之后每次 `git push` 到 main，Cloudflare 会自动构建部署。

## API

- `POST /api/numbers`  body: `{"value": 42}` → `{ok, id, value, ts}`
- `GET  /api/numbers`  → `{items: [{key, value, ts}, ...]}`（最近 20 条，时间倒序）
