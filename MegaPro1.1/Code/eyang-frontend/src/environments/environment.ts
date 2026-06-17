export const environment = {
  production: false,
  apiUrl: '/api',
  wsUrl: (typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host : '') + '/ws'
};

