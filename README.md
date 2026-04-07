# 検証ダッシュボード — セットアップガイド

## 必要なもの
- Node.js 18以上
- GitHubアカウント
- Railwayアカウント（https://railway.app）
- Notionインテグレーション
- Google Cloudサービスアカウント

---

## 1. Notion APIキーの取得

1. https://www.notion.so/my-integrations を開く
2. 「新しいインテグレーション」を作成
3. 名前を入力（例：検証ダッシュボード）し「送信」
4. 表示される `secret_xxx...` をコピー → `NOTION_API_KEY` に設定

### Notionページへの接続
- 検証手順書DBを開く → 右上「...」→「接続を追加」→ 作成したインテグレーションを選択
- 評価・分析シートDBも同様に接続

### DBのIDを取得
- NotionのDBページをブラウザで開く
- URLの `https://www.notion.so/【ここの32文字】?v=...` をコピー
- ハイフンなしの32文字が `NOTION_MANUAL_DB_ID` / `NOTION_EVAL_DB_ID`

---

## 2. Google Sheetsサービスアカウントの設定

1. https://console.cloud.google.com を開く
2. プロジェクトを作成（または既存を選択）
3. 「APIとサービス」→「ライブラリ」→「Google Sheets API」を有効化
4. 「IAMと管理」→「サービスアカウント」→「作成」
5. 名前を入力し作成 → 「鍵を追加」→「JSON」でダウンロード
6. ダウンロードしたJSONの中身をコピー → `GOOGLE_SERVICE_ACCOUNT_JSON` に設定

### スプレッドシートへのアクセス権限付与
- スプレッドシートを開く → 「共有」
- サービスアカウントのメール（`xxx@xxx.iam.gserviceaccount.com`）を閲覧者として追加

---

## 3. ローカル開発

```bash
git clone <your-repo>
cd verification-app
npm install
cp .env.example .env.local
# .env.local に各値を入力
npm run dev
# http://localhost:3000 で確認
```

---

## 4. GitHubにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-org/verification-app.git
git push -u origin main
```

---

## 5. Railwayにデプロイ

1. https://railway.app にログイン
2. 「New Project」→「Deploy from GitHub repo」
3. リポジトリを選択
4. 「Variables」タブで以下の環境変数を設定：

| 変数名 | 値 |
|--------|-----|
| `NOTION_API_KEY` | `secret_xxx...` |
| `NOTION_MANUAL_DB_ID` | 32文字のID |
| `NOTION_EVAL_DB_ID` | 32文字のID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSONの中身（1行） |
| `GOOGLE_SPREADSHEET_ID` | スプレッドシートID |

5. 自動でビルド・デプロイが始まる
6. 「Settings」→「Domains」→「Generate Domain」でURLが発行される

---

## Notionのプロパティ名について

`src/lib/notion.ts` の `getAxesFromPage()` 内で検証軸のプロパティ名を参照しています。
実際のNotionDBのプロパティ名に合わせて変更してください：

```ts
// 検証軸のタイトルプロパティ名
const titleProp = page.properties['検証軸'] ?? page.properties['名前']

// 内容プロパティ名
const detailProp = page.properties['内容'] ?? page.properties['詳細']
```
