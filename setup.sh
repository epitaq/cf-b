#!/bin/bash

# FestMap 開発環境セットアップスクリプト
echo "🚀 FestMap 開発環境をセットアップ中..."

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# エラーハンドリング
set -e

# 関数定義
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Node.jsバージョンチェック
check_node_version() {
    print_status "Node.jsバージョンをチェック中..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.jsがインストールされていません"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js v18.0.0以上が必要です。現在のバージョン: v$NODE_VERSION"
        exit 1
    fi
    
    print_success "Node.js v$NODE_VERSION が確認されました"
}

# npmバージョンチェック
check_npm_version() {
    print_status "npmバージョンをチェック中..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npmがインストールされていません"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm v$NPM_VERSION が確認されました"
}

# ディレクトリ作成
create_directories() {
    print_status "必要なディレクトリを作成中..."
    
    mkdir -p database
    mkdir -p server/uploads
    mkdir -p client/src/components
    mkdir -p client/src/styles
    
    print_success "ディレクトリが作成されました"
}

# 依存関係インストール
install_dependencies() {
    print_status "依存関係をインストール中..."
    
    # ルートの依存関係
    print_status "ルートの依存関係をインストール中..."
    npm install
    
    # サーバーの依存関係
    print_status "サーバーの依存関係をインストール中..."
    cd server
    npm install
    cd ..
    
    # クライアントの依存関係
    print_status "クライアントの依存関係をインストール中..."
    cd client
    npm install
    cd ..
    
    print_success "全ての依存関係がインストールされました"
}

# データベース初期化
initialize_database() {
    print_status "データベースを初期化中..."
    
    cd server
    node models/database.js
    cd ..
    
    print_success "データベースが初期化されました"
}

# 環境変数ファイル作成
create_env_files() {
    print_status "環境変数ファイルを作成中..."
    
    # サーバー用.env
    if [ ! -f "server/.env" ]; then
        cat > server/.env << EOF
NODE_ENV=development
PORT=5000
DB_PATH=../database/festmap.db
UPLOAD_PATH=./uploads
EOF
        print_success "server/.env が作成されました"
    else
        print_warning "server/.env は既に存在します"
    fi
    
    # クライアント用.env
    if [ ! -f "client/.env" ]; then
        cat > client/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
EOF
        print_success "client/.env が作成されました"
    else
        print_warning "client/.env は既に存在します"
    fi
}

# 権限設定
set_permissions() {
    print_status "ファイル権限を設定中..."
    
    chmod +x setup.sh
    chmod -R 755 database
    chmod -R 755 server/uploads
    
    print_success "権限が設定されました"
}

# 開発サーバー起動確認
test_servers() {
    print_status "開発サーバーの起動テスト中..."
    
    # バックエンドサーバーテスト
    print_status "バックエンドサーバーをテスト中..."
    cd server
    timeout 10s npm run dev &
    SERVER_PID=$!
    sleep 5
    
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_success "バックエンドサーバーが正常に起動しました"
    else
        print_warning "バックエンドサーバーの起動確認に失敗しました"
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    cd ..
}

# メイン実行
main() {
    echo "=================================="
    echo "🎪 FestMap セットアップスクリプト"
    echo "=================================="
    echo ""
    
    check_node_version
    check_npm_version
    create_directories
    install_dependencies
    create_env_files
    initialize_database
    set_permissions
    
    echo ""
    echo "=================================="
    print_success "🎉 セットアップが完了しました！"
    echo "=================================="
    echo ""
    echo "📋 次のステップ:"
    echo "1. 開発サーバーを起動: npm run dev"
    echo "2. ブラウザで http://localhost:3000 を開く"
    echo "3. API確認: http://localhost:5000/api/health"
    echo ""
    echo "🛠️  利用可能なコマンド:"
    echo "- npm run dev          # 開発サーバー起動"
    echo "- npm run init-db      # データベース再初期化"
    echo "- npm run client:build # プロダクションビルド"
    echo ""
    echo "📚 詳細は README.md を確認してください"
    echo ""
}

# スクリプト実行
main "$@"