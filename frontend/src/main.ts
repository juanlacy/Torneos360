import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

/**
 * Interceptar redirect de Microsoft OAuth ANTES de que Angular routee.
 * Si la URL tiene #code=... es un redirect response de MSAL.
 * Lo procesamos, obtenemos el token y redirigimos al login con el token.
 */
async function handleMsalRedirect(): Promise<void> {
  const hash = window.location.hash;
  if (!hash || !hash.includes('code=') || !environment.microsoftClientId) return;

  try {
    const { PublicClientApplication } = await import('@azure/msal-browser');
    const msalInstance = new PublicClientApplication({
      auth: {
        clientId: environment.microsoftClientId,
        authority: `https://login.microsoftonline.com/${environment.microsoftTenantId}`,
        redirectUri: window.location.origin + '/auth-redirect.html',
      },
    });
    await msalInstance.initialize();

    const result = await msalInstance.handleRedirectPromise();
    if (result?.accessToken) {
      // Guardar el token temporalmente para que el login lo procese
      sessionStorage.setItem('msal_pending_token', result.accessToken);
      // Limpiar el hash y redirigir al login
      window.history.replaceState({}, '', '/auth/login?msal=1');
      window.location.reload();
      return;
    }
    // Si no hay resultado, limpiar el hash para que la app cargue normal
    window.history.replaceState({}, '', window.location.pathname);
  } catch (err) {
    console.error('MSAL redirect handling error:', err);
    window.history.replaceState({}, '', '/');
  }
}

handleMsalRedirect().then(() => {
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
});
