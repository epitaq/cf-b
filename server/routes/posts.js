const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { db } = require('../models/database');
const router = express.Router();

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  }
});

// バリデーションルール
const postValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 280 })
    .withMessage('投稿内容は1文字以上280文字以下で入力してください'),
  body('author_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('投稿者名は1文字以上50文字以下で入力してください'),
  body('location_id')
    .isInt({ min: 1 })
    .withMessage('有効な位置IDを選択してください')
];

// 全投稿取得
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const locationId = req.query.location_id;

  let query = `
    SELECT 
      p.*,
      l.name as location_name,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN locations l ON p.location_id = l.id
  `;

  let params = [];

  if (locationId) {
    query += ' WHERE p.location_id = ?';
    params.push(parseInt(locationId));
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('投稿取得エラー:', err);
      return res.status(500).json({
        error: '投稿の取得に失敗しました',
        details: err.message
      });
    }

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      pagination: {
        limit,
        offset,
        hasMore: rows.length === limit
      }
    });
  });
});

// 特定投稿取得
router.get('/:id', (req, res) => {
  const postId = parseInt(req.params.id);

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  const query = `
    SELECT 
      p.*,
      l.name as location_name,
      l.latitude,
      l.longitude,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN locations l ON p.location_id = l.id
    WHERE p.id = ?
  `;

  db.get(query, [postId], (err, row) => {
    if (err) {
      console.error('投稿取得エラー:', err);
      return res.status(500).json({
        error: '投稿の取得に失敗しました',
        details: err.message
      });
    }

    if (!row) {
      return res.status(404).json({
        error: '指定された投稿が見つかりません'
      });
    }

    res.json({
      success: true,
      data: row
    });
  });
});

// 新規投稿作成
router.post('/', upload.single('image'), postValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: errors.array()
    });
  }

  const { content, author_name, location_id } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  // 位置IDの存在確認
  db.get('SELECT id FROM locations WHERE id = ?', [location_id], (err, location) => {
    if (err) {
      console.error('位置確認エラー:', err);
      return res.status(500).json({
        error: '位置の確認に失敗しました'
      });
    }

    if (!location) {
      return res.status(400).json({
        error: '指定された位置が存在しません'
      });
    }

    // 投稿を挿入
    const insertQuery = `
      INSERT INTO posts (content, author_name, location_id, image_url)
      VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [content, author_name, location_id, imageUrl], function (err) {
      if (err) {
        console.error('投稿作成エラー:', err);
        return res.status(500).json({
          error: '投稿の作成に失敗しました',
          details: err.message
        });
      }

      // 作成された投稿を取得して返す
      const selectQuery = `
        SELECT 
          p.*,
          l.name as location_name,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN locations l ON p.location_id = l.id
        WHERE p.id = ?
      `;

      db.get(selectQuery, [this.lastID], (err, row) => {
        if (err) {
          console.error('作成投稿取得エラー:', err);
          return res.status(500).json({
            error: '投稿は作成されましたが、取得に失敗しました'
          });
        }

        res.status(201).json({
          success: true,
          message: '投稿が正常に作成されました',
          data: row
        });
      });
    });
  });
});

// 投稿削除
router.delete('/:id', (req, res) => {
  const postId = parseInt(req.params.id);

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  // 投稿の存在確認
  db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      console.error('投稿確認エラー:', err);
      return res.status(500).json({
        error: '投稿の確認に失敗しました'
      });
    }

    if (!post) {
      return res.status(404).json({
        error: '指定された投稿が見つかりません'
      });
    }

    // 関連データを削除（コメント、いいね）
    db.serialize(() => {
      db.run('DELETE FROM comments WHERE post_id = ?', [postId]);
      db.run('DELETE FROM likes WHERE post_id = ?', [postId]);
      db.run('DELETE FROM posts WHERE id = ?', [postId], function (err) {
        if (err) {
          console.error('投稿削除エラー:', err);
          return res.status(500).json({
            error: '投稿の削除に失敗しました',
            details: err.message
          });
        }

        res.json({
          success: true,
          message: '投稿が正常に削除されました'
        });
      });
    });
  });
});

module.exports = router;