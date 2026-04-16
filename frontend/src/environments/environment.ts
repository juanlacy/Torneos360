const isProd = window.location.hostname !== 'localhost';

export const environment = {
  production: isProd,
  apiUrl: isProd ? '/api' : 'http://localhost:7300',
  googleClientId: '214922698115-nqn1gljpv988q09251kl3m5m96g478cr.apps.googleusercontent.com',
  microsoftClientId: '8373ec57-6435-4455-8356-ed4b7e218f4c',
  microsoftTenantId: 'common',
};
