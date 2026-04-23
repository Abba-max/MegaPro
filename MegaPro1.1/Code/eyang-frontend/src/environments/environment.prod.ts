export const environment = {
  production: true,
  apiUrl: '/api',
  get wsUrl() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws`;
  }
};
