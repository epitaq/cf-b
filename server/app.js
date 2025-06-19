const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// データベース初期化
const { setupDatabase } = require('./models/database');

// ルーターのインポート
const postsRouter = require('./routes/posts');
const locationsRouter = require('./routes/locations');
const likesRouter = require('./routes/likes');
const commentsRouter = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 5000;

// データベースディレクトリ作成
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// アップロードディレクトリ作成
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ミドルウェア設定
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静的ファイル配信（アップロードされた画像）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ルーター設定
app.use('/api/posts', postsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/comments', commentsRouter);

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FestMap API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404エラーハンドリング
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    path: req.originalUrl,
    method: req.method
  });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'サーバーエラーが発生しました'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// データベース初期化とサーバー起動
const startServer = async () => {
  try {
    console.log('データベースを初期化中...');
    await setupDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 FestMap APIサーバーが起動しました`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 ヘルスチェック: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
};

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 サーバーを停止中...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 サーバーを停止中...');
  process.exit(0);
});

// サーバー起動
startServer();

module.exports = app;