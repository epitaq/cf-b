FROM node:18-bullseye

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
  git \
  sqlite3 \
  curl \
  vim \
  && rm -rf /var/lib/apt/lists/*

# グローバルにnpmパッケージをインストール
USER node
RUN npm install -g nodemon concurrently

# 作業ディレクトリを設定
WORKDIR /workspace

# ユーザーの権限を設定
RUN sudo chown -R node:node /workspace

# Node.jsのバージョン確認
RUN node --version && npm --version

# デフォルトのユーザー設定
USER node