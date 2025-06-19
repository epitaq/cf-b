import axios from 'axios';

// APIベースURL設定
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axiosインスタンス作成
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);

    // エラーメッセージの統一
    const errorMessage = error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'ネットワークエラーが発生しました';

    return Promise.reject(new Error(errorMessage));
  }
);

// ユーザー識別子生成（簡易版）
const getUserIdentifier = () => {
  let identifier = localStorage.getItem('festmap_user_id');
  if (!identifier) {
    identifier = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('festmap_user_id', identifier);
  }
  return identifier;
};

// 位置情報API
export const locationAPI = {
  // 全位置情報取得
  getAll: () => api.get('/locations'),

  // 特定位置情報取得
  getById: (id) => api.get(`/locations/${id}`),

  // 位置別投稿取得
  getPosts: (id, params = {}) => api.get(`/locations/${id}/posts`, { params }),
};

// 投稿API
export const postAPI = {
  // 投稿一覧取得
  getAll: (params = {}) => api.get('/posts', { params }),

  // 特定投稿取得
  getById: (id) => api.get(`/posts/${id}`),

  // 新規投稿作成
  create: (postData) => {
    const formData = new FormData();
    formData.append('content', postData.content);
    formData.append('author_name', postData.author_name);
    formData.append('location_id', postData.location_id);

    if (postData.image) {
      formData.append('image', postData.image);
    }

    return api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 投稿削除
  delete: (id) => api.delete(`/posts/${id}`),
};

// いいねAPI
export const likeAPI = {
  // いいね数取得
  getCount: (postId) => api.get(`/likes/posts/${postId}`),

  // いいね追加
  add: (postId) => api.post(`/likes/posts/${postId}`, {
    user_identifier: getUserIdentifier()
  }),

  // いいね削除
  remove: (postId) => api.delete(`/likes/posts/${postId}`, {
    data: { user_identifier: getUserIdentifier() }
  }),

  // ユーザーのいいね投稿一覧
  getUserLikes: (params = {}) => api.get(`/likes/user/${getUserIdentifier()}`, { params }),
};

// コメントAPI
export const commentAPI = {
  // 投稿のコメント一覧取得
  getByPostId: (postId, params = {}) => api.get(`/comments/posts/${postId}`, { params }),

  // コメント追加
  add: (postId, commentData) => api.post(`/comments/posts/${postId}`, commentData),

  // 特定コメント取得
  getById: (id) => api.get(`/comments/${id}`),

  // コメント削除
  delete: (id) => api.delete(`/comments/${id}`),

  // コメント数取得
  getCount: (postId) => api.get(`/comments/posts/${postId}/count`),

  // ユーザーのコメント一覧
  getUserComments: (authorName, params = {}) => api.get(`/comments/user/${authorName}`, { params }),
};

// ヘルスチェックAPI
export const healthAPI = {
  check: () => api.get('/health'),
};

// エラーハンドリング用ヘルパー関数
export const handleAPIError = (error, defaultMessage = 'エラーが発生しました') => {
  console.error('API Error:', error);

  if (error.response) {
    // サーバーからのエラーレスポンス
    return error.response.data?.error || error.response.data?.message || defaultMessage;
  } else if (error.request) {
    // ネットワークエラー
    return 'ネットワークに接続できません。インターネット接続を確認してください。';
  } else {
    // その他のエラー
    return error.message || defaultMessage;
  }
};

// ローディング状態管理用ヘルパー
export const createAPICall = async (apiFunction, setLoading, setError) => {
  try {
    setLoading && setLoading(true);
    setError && setError(null);
    const response = await apiFunction();
    return response.data;
  } catch (error) {
    const errorMessage = handleAPIError(error);
    setError && setError(errorMessage);
    throw error;
  } finally {
    setLoading && setLoading(false);
  }
};

// ユーティリティ関数
export const utils = {
  getUserIdentifier,
  formatDate: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  truncateText: (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  validateImageFile: (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('JPEG、PNG、GIF、WebP形式の画像ファイルのみアップロード可能です');
    }

    if (file.size > maxSize) {
      throw new Error('ファイルサイズは5MB以下にしてください');
    }

    return true;
  }
};

export default api;