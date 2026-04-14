const isProd = window.location.hostname !== 'localhost';

export const environment = {
  production: isProd,
  apiUrl: isProd ? '/api' : 'http://localhost:7300',
  googleClientId: '',
  microsoftClientId: '',
  microsoftTenantId: '',
};
