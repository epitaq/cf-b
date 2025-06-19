# FestMap - 電通大学園祭SNSアプリ

電通大学園祭向けの位置情報ベースSNSアプリケーションのプロトタイプです。

## 📱 機能概要

- **地図機能**: 学園祭会場の地図とピン表示
- **SNS機能**: 位置情報ベースのタイムライン（Twitter/Instagram風）
- **投稿機能**: テキスト・画像投稿
- **インタラクション**: いいね・コメント機能

## 🛠️ 技術スタック

- **フロントエンド**: React + Leaflet + Tailwind CSS
- **バックエンド**: Node.js + Express + SQLite
- **開発環境**: Dev Container (Docker)

## 🚀 開発環境セットアップ

### 前提条件
- Docker Desktop
- Visual Studio Code
- Dev Containers拡張機能

### セットアップ手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd festmap
```

2. VSCodeでプロジェクトを開く
```bash
code .
```

3. Dev Containerで開く
- VSCodeで `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
- "Dev Containers: Reopen in Container" を選択
- 初回は環境構築に数分かかります

4. 開発サーバー起動
```bash
# フロントエンドとバックエンドを同時起動
npm run dev
```

## 📂 プロジェクト構造

```
festmap/
├── .devcontainer/          # Dev Container設定
├── client/                 # React フロントエンド
├── server/                 # Node.js バックエンド
├── database/              # SQLite データベース
└── docker-compose.yml     # Docker設定
```

## 🌐 アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:5000

## 📍 電通大キャンパス位置

アプリでは以下の場所にピンが設置されています：
- 正門前
- 学生食堂
- 図書館前
- 体育館
- 研究棟A
- 中央広場
- 購買部
- 駐車場

## 🔧 開発コマンド

```bash
# フロントエンド開発サーバー
cd client && npm start

# バックエンド開発サーバー
cd server && npm run dev

# 両方同時起動
npm run dev

# データベース初期化
cd server && npm run init-db
```

## 📝 API エンドポイント

### 投稿関連
- `GET /api/posts` - 投稿一覧
- `POST /api/posts` - 新規投稿
- `GET /api/posts/:id` - 特定投稿

### いいね・コメント
- `POST /api/posts/:id/like` - いいね追加
- `GET /api/posts/:id/comments` - コメント一覧
- `POST /api/posts/:id/comments` - コメント追加

### 位置情報
- `GET /api/locations` - 位置情報一覧

## 🎯 開発フェーズ

- [x] Phase 1: 基盤構築
- [ ] Phase 2: コア機能開発
- [ ] Phase 3: インタラクション機能
- [ ] Phase 4: 統合・調整

## 📄 ライセンス

このプロジェクトはプロトタイプ用途です。

---

**作成日**: 2025年6月19日  
**プロジェクト**: FestMap - 電通大学園祭SNSアプリ