import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';


let faro = null;

if (process.env.PUBLIC_DOJO_PROFILE !== 'dev' && process.env.PUBLIC_FARO_COLLECTOR_URL) {
    faro = initializeFaro({
        url: process.env.PUBLIC_FARO_COLLECTOR_URL,
        app: {
            name: 'Ponziland ',
            version: 'ded7df3e539ef56fa717255ce3565a0aee66461c',
            environment: process.env.PUBLIC_DOJO_PROFILE,
        },
        instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
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
