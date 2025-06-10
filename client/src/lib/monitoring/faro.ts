import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { dev as isDev } from '$app/environment';
import { PUBLIC_GIT_COMMIT_HASH } from '$env/static/public';

let faro = null;

if (!isDev && process.env.PUBLIC_FARO_COLLECTOR_URL) {
  faro = initializeFaro({
    url: process.env.PUBLIC_FARO_COLLECTOR_URL,
    app: {
      name: 'Ponziland ',
      version: PUBLIC_GIT_COMMIT_HASH,
      environment: process.env.PUBLIC_DOJO_PROFILE,
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
    ],
  });
}

export const sendError = (error: Error, tags?: Record<string, any>) => {
  if (faro) {
    faro.api.pushError(error, { context: tags });
  } else {
    console.warn('Faro not initialized, error not sent');
  }
};

export default faro;
