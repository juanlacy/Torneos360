import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Si la URL tiene #code= de Microsoft OAuth redirect, redirigir a /auth/login
// para que el LoginComponent procese la respuesta con MSAL
if (window.location.hash?.includes('code=') && !window.location.pathname.includes('/auth/login')) {
  const hash = window.location.hash;
  window.location.href = '/auth/login' + hash;
} else {
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}
