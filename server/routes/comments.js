const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../models/database');
const router = express.Router();

// バリデーションルール
const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('コメント内容は1文字以上500文字以下で入力してください'),
  body('author_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('投稿者名は1文字以上50文字以下で入力してください')
];

// 投稿のコメント一覧取得
router.get('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  const query = `
    SELECT 
      c.*,
      p.author_name as post_author
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [postId, limit, offset], (err, rows) => {
    if (err) {
      console.error('コメント取得エラー:', err);
      return res.status(500).json({
        error: 'コメントの取得に失敗しました',
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

// コメント追加
router.post('/posts/:postId', commentValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: errors.array()
    });
  }

  const postId = parseInt(req.params.postId);
  const { content, author_name } = req.body;

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  // 投稿の存在確認
  db.get('SELECT id FROM posts WHERE id = ?', [postId], (err, post) => {
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

    // コメントを追加
    const insertQuery = `
      INSERT INTO comments (post_id, content, author_name)
      VALUES (?, ?, ?)
    `;

    db.run(insertQuery, [postId, content, author_name], function (err) {
      if (err) {
        console.error('コメント追加エラー:', err);
        return res.status(500).json({
          error: 'コメントの追加に失敗しました',
          details: err.message
        });
      }

      // 作成されたコメントを取得して返す
      const selectQuery = `
        SELECT 
          c.*,
          p.author_name as post_author
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.id = ?
      `;

      db.get(selectQuery, [this.lastID], (err, row) => {
        if (err) {
          console.error('作成コメント取得エラー:', err);
          return res.status(500).json({
            error: 'コメントは作成されましたが、取得に失敗しました'
          });
        }

        res.status(201).json({
          success: true,
          message: 'コメントが正常に追加されました',
          data: row
        });
      });
    });
  });
});

// 特定コメント取得
router.get('/:id', (req, res) => {
  const commentId = parseInt(req.params.id);

  if (isNaN(commentId)) {
    return res.status(400).json({
      error: '無効なコメントIDです'
    });
  }

  const query = `
    SELECT 
      c.*,
      p.author_name as post_author,
      p.content as post_content
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.id = ?
  `;

  db.get(query, [commentId], (err, row) => {
    if (err) {
      console.error('コメント取得エラー:', err);
      return res.status(500).json({
        error: 'コメントの取得に失敗しました',
        details: err.message
      });
    }

    if (!row) {
      return res.status(404).json({
        error: '指定されたコメントが見つかりません'
      });
    }

    res.json({
      success: true,
      data: row
    });
  });
});

// コメント削除
router.delete('/:id', (req, res) => {
  const commentId = parseInt(req.params.id);

  if (isNaN(commentId)) {
    return res.status(400).json({
      error: '無効なコメントIDです'
    });
  }

  // コメントの存在確認
  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) {
      console.error('コメント確認エラー:', err);
      return res.status(500).json({
        error: 'コメントの確認に失敗しました'
      });
    }

    if (!comment) {
      return res.status(404).json({
        error: '指定されたコメントが見つかりません'
      });
    }

    // コメントを削除
    db.run('DELETE FROM comments WHERE id = ?', [commentId], function (err) {
      if (err) {
        console.error('コメント削除エラー:', err);
        return res.status(500).json({
          error: 'コメントの削除に失敗しました',
          details: err.message
        });
      }

      res.json({
        success: true,
        message: 'コメントが正常に削除されました',
        data: {
          deleted_comment_id: commentId,
          post_id: comment.post_id
        }
      });
    });
  });
});

// 投稿のコメント数取得
router.get('/posts/:postId/count', (req, res) => {
  const postId = parseInt(req.params.postId);

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  const query = 'SELECT COUNT(*) as comment_count FROM comments WHERE post_id = ?';

  db.get(query, [postId], (err, row) => {
    if (err) {
      console.error('コメント数取得エラー:', err);
      return res.status(500).json({
        error: 'コメント数の取得に失敗しました',
        details: err.message
      });
    }

    res.json({
      success: true,
      data: {
        post_id: postId,
        comment_count: row.comment_count || 0
      }
    });
  });
});

// ユーザーのコメント一覧
router.get('/user/:authorName', (req, res) => {
  const authorName = req.params.authorName;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const query = `
    SELECT 
      c.*,
      p.content as post_content,
      p.author_name as post_author,
      l.name as location_name
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    JOIN locations l ON p.location_id = l.id
    WHERE c.author_name = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [authorName, limit, offset], (err, rows) => {
    if (err) {
      console.error('ユーザーコメント取得エラー:', err);
      return res.status(500).json({
        error: 'ユーザーのコメント取得に失敗しました',
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

module.exports = router;