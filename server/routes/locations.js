const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// 全位置情報取得
router.get('/', (req, res) => {
  const query = `
    SELECT 
      l.*,
      COUNT(p.id) as post_count
    FROM locations l
    LEFT JOIN posts p ON l.id = p.location_id
    GROUP BY l.id
    ORDER BY l.id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('位置情報取得エラー:', err);
      return res.status(500).json({
        error: '位置情報の取得に失敗しました',
        details: err.message
      });
    }

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  });
});

// 特定位置情報取得
router.get('/:id', (req, res) => {
  const locationId = parseInt(req.params.id);

  if (isNaN(locationId)) {
    return res.status(400).json({
      error: '無効な位置IDです'
    });
  }

  const query = `
    SELECT 
      l.*,
      COUNT(p.id) as post_count
    FROM locations l
    LEFT JOIN posts p ON l.id = p.location_id
    WHERE l.id = ?
    GROUP BY l.id
  `;

  db.get(query, [locationId], (err, row) => {
    if (err) {
      console.error('位置情報取得エラー:', err);
      return res.status(500).json({
        error: '位置情報の取得に失敗しました',
        details: err.message
      });
    }

    if (!row) {
      return res.status(404).json({
        error: '指定された位置が見つかりません'
      });
    }

    res.json({
      success: true,
      data: row
    });
  });
});

// 位置周辺の投稿取得
router.get('/:id/posts', (req, res) => {
  const locationId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  if (isNaN(locationId)) {
    return res.status(400).json({
      error: '無効な位置IDです'
    });
  }

  const query = `
    SELECT 
      p.*,
      l.name as location_name,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN locations l ON p.location_id = l.id
    WHERE p.location_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [locationId, limit, offset], (err, rows) => {
    if (err) {
      console.error('位置別投稿取得エラー:', err);
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

module.exports = router;