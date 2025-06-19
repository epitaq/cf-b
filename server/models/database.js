const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースファイルのパス
const dbPath = path.join(__dirname, '../../database/festmap.db');

// データベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('SQLiteデータベースに接続しました');
  }
});

// テーブル作成
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // LOCATIONSテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          description TEXT
        )
      `, (err) => {
        if (err) {
          console.error('LOCATIONSテーブル作成エラー:', err);
          reject(err);
        }
      });

      // POSTSテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          location_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          author_name TEXT NOT NULL,
          likes_count INTEGER DEFAULT 0,
          FOREIGN KEY (location_id) REFERENCES locations (id)
        )
      `, (err) => {
        if (err) {
          console.error('POSTSテーブル作成エラー:', err);
          reject(err);
        }
      });

      // COMMENTSテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id)
        )
      `, (err) => {
        if (err) {
          console.error('COMMENTSテーブル作成エラー:', err);
          reject(err);
        }
      });

      // LIKESテーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_identifier TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id),
          UNIQUE(post_id, user_identifier)
        )
      `, (err) => {
        if (err) {
          console.error('LIKESテーブル作成エラー:', err);
          reject(err);
        } else {
          console.log('全テーブルが正常に作成されました');
          resolve();
        }
      });
    });
  });
};

// 初期データ投入
const insertInitialData = () => {
  return new Promise((resolve, reject) => {
    // 電通大キャンパス位置データ
    const campusLocations = [
      { name: "正門前", lat: 35.6581, lng: 139.5414, description: "メインエントランス" },
      { name: "学生食堂", lat: 35.6585, lng: 139.5420, description: "食事・休憩スペース" },
      { name: "図書館前", lat: 35.6590, lng: 139.5425, description: "静かな学習エリア" },
      { name: "体育館", lat: 35.6575, lng: 139.5430, description: "スポーツイベント会場" },
      { name: "研究棟A", lat: 35.6595, lng: 139.5415, description: "研究発表・展示エリア" },
      { name: "中央広場", lat: 35.6588, lng: 139.5422, description: "メインステージ・イベント会場" },
      { name: "購買部", lat: 35.6583, lng: 139.5418, description: "お土産・グッズ販売" },
      { name: "駐車場", lat: 35.6578, lng: 139.5412, description: "来場者駐車スペース" }
    ];

    // 既存データをチェック
    db.get("SELECT COUNT(*) as count FROM locations", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count === 0) {
        // 初期データを挿入
        const stmt = db.prepare("INSERT INTO locations (name, latitude, longitude, description) VALUES (?, ?, ?, ?)");

        campusLocations.forEach((location) => {
          stmt.run([location.name, location.lat, location.lng, location.description]);
        });

        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('初期位置データが正常に挿入されました');
            resolve();
          }
        });
      } else {
        console.log('位置データは既に存在します');
        resolve();
      }
    });
  });
};

// データベース初期化実行
const setupDatabase = async () => {
  try {
    await initializeDatabase();
    await insertInitialData();
    console.log('データベースセットアップが完了しました');
  } catch (error) {
    console.error('データベースセットアップエラー:', error);
  }
};

// このファイルが直接実行された場合
if (require.main === module) {
  setupDatabase().then(() => {
    db.close();
  });
}

module.exports = {
  db,
  initializeDatabase,
  insertInitialData,
  setupDatabase
};