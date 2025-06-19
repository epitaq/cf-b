const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../models/database');
const router = express.Router();

// バリデーションルール
const likeValidation = [
  body('user_identifier')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('ユーザー識別子が必要です')
];

// 投稿のいいね数取得
router.get('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  const query = `
    SELECT 
      COUNT(*) as like_count,
      GROUP_CONCAT(user_identifier) as liked_users
    FROM likes 
    WHERE post_id = ?
  `;

  db.get(query, [postId], (err, row) => {
    if (err) {
      console.error('いいね数取得エラー:', err);
      return res.status(500).json({
        error: 'いいね数の取得に失敗しました',
        details: err.message
      });
    }

    res.json({
      success: true,
      data: {
        post_id: postId,
        like_count: row.like_count || 0,
        liked_users: row.liked_users ? row.liked_users.split(',') : []
      }
    });
  });
});

// いいね追加
router.post('/posts/:postId', likeValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: errors.array()
    });
  }

  const postId = parseInt(req.params.postId);
  const { user_identifier } = req.body;

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

    // 既存のいいねをチェック
    db.get('SELECT id FROM likes WHERE post_id = ? AND user_identifier = ?',
      [postId, user_identifier], (err, existingLike) => {
        if (err) {
          console.error('いいね確認エラー:', err);
          return res.status(500).json({
            error: 'いいねの確認に失敗しました'
          });
        }

        if (existingLike) {
          return res.status(409).json({
            error: '既にいいねしています'
          });
        }

        // いいねを追加
        db.run('INSERT INTO likes (post_id, user_identifier) VALUES (?, ?)',
          [postId, user_identifier], function (err) {
            if (err) {
              console.error('いいね追加エラー:', err);
              return res.status(500).json({
                error: 'いいねの追加に失敗しました',
                details: err.message
              });
            }

            // 投稿のいいね数を更新
            db.run('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
              [postId], (err) => {
                if (err) {
                  console.error('いいね数更新エラー:', err);
                }

                // 更新されたいいね数を取得
                db.get('SELECT likes_count FROM posts WHERE id = ?', [postId], (err, row) => {
                  res.status(201).json({
                    success: true,
                    message: 'いいねを追加しました',
                    data: {
                      post_id: postId,
                      like_count: row ? row.likes_count : 0,
                      user_identifier
                    }
                  });
                });
              });
          });
      });
  });
});

// いいね削除
router.delete('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const { user_identifier } = req.body;

  if (isNaN(postId)) {
    return res.status(400).json({
      error: '無効な投稿IDです'
    });
  }

  if (!user_identifier) {
    return res.status(400).json({
      error: 'ユーザー識別子が必要です'
    });
  }

  // いいねの存在確認
  db.get('SELECT id FROM likes WHERE post_id = ? AND user_identifier = ?',
    [postId, user_identifier], (err, like) => {
      if (err) {
        console.error('いいね確認エラー:', err);
        return res.status(500).json({
          error: 'いいねの確認に失敗しました'
        });
      }

      if (!like) {
        return res.status(404).json({
          error: 'いいねが見つかりません'
        });
      }

      // いいねを削除
      db.run('DELETE FROM likes WHERE post_id = ? AND user_identifier = ?',
        [postId, user_identifier], function (err) {
          if (err) {
            console.error('いいね削除エラー:', err);
            return res.status(500).json({
              error: 'いいねの削除に失敗しました',
              details: err.message
            });
          }

          // 投稿のいいね数を更新
          db.run('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?',
            [postId], (err) => {
              if (err) {
                console.error('いいね数更新エラー:', err);
              }

              // 更新されたいいね数を取得
              db.get('SELECT likes_count FROM posts WHERE id = ?', [postId], (err, row) => {
                res.json({
                  success: true,
                  message: 'いいねを削除しました',
                  data: {
                    post_id: postId,
                    like_count: row ? Math.max(0, row.likes_count) : 0
                  }
                });
              });
            });
        });
    });
});

// ユーザーがいいねした投稿一覧
router.get('/user/:userIdentifier', (req, res) => {
  const userIdentifier = req.params.userIdentifier;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const query = `
    SELECT 
      p.*,
      l.name as location_name,
      likes.created_at as liked_at
    FROM likes
    JOIN posts p ON likes.post_id = p.id
    JOIN locations l ON p.location_id = l.id
    WHERE likes.user_identifier = ?
    ORDER BY likes.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [userIdentifier, limit, offset], (err, rows) => {
    if (err) {
      console.error('ユーザーいいね投稿取得エラー:', err);
      return res.status(500).json({
        error: 'いいねした投稿の取得に失敗しました',
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