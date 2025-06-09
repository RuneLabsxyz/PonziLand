import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
  app: {
    name: 'Ponziland ',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});

export const sendError = (error: Error, tags?: Record<string, any>) => {
  faro.api.pushError(error, { context: tags });
};

export default faro;
