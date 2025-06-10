import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { dev as isDev } from '$app/environment';

let faro = null;
const gitHash = process.env.GIT_HASH;

if (!isDev && process.env.PUBLIC_FARO_COLLECTOR_URL) {
  faro = initializeFaro({
    url: process.env.PUBLIC_FARO_COLLECTOR_URL,
    app: {
      name: 'Ponziland ',
      version: gitHash,
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
