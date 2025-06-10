import {
  getWebInstrumentations,
  initializeFaro,
  type Faro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { dev as isDev } from '$app/environment';
import {
  PUBLIC_GIT_COMMIT_HASH,
  PUBLIC_FARO_COLLECTOR_URL,
  PUBLIC_DOJO_PROFILE,
} from '$env/static/public';

let faro: Faro | null = null;

export function setupFaro() {
  if (isDev || faro || !PUBLIC_FARO_COLLECTOR_URL) {
    return;
  }
  faro = initializeFaro({
    url: PUBLIC_FARO_COLLECTOR_URL,
    app: {
      name: 'ponziland',
      version: PUBLIC_GIT_COMMIT_HASH,
      environment: PUBLIC_DOJO_PROFILE,
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
    console.error(error);
  }
};

export default faro;
