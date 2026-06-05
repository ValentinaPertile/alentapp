import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';

// 1. Configurar Prometheus Exporter en el puerto 9464
const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
});

// 2. Crear el SDK con las auto-instrumentaciones básicas
const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {},
            '@opentelemetry/instrumentation-fastify': {},
        }),
    ],
});

// 3. Iniciar el SDK en el proceso de Node
sdk.start();

// 4. Obtener el meter para nuestras métricas personalizadas del club
const meter = metrics.getMeter('alentapp-api');

// 5. Métricas RED
export const requestCounter = meter.createCounter('http.requests.total', {
    description: 'Total de requests HTTP recibidos',
});

export const errorCounter = meter.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP 4xx/5xx registrados',
});

export const requestDuration = meter.createHistogram('http.request.duration', {
    description: 'Duración de requests en milisegundos',
    unit: 'ms',
});

// 6. Métricas adicionales pedidas por la consigna
export const activeRequests = meter.createUpDownCounter('http.requests.active', {
    description: 'Cantidad de requests HTTP activos',
});

export const memoryUsage = meter.createObservableGauge('process.memory.usage', {
    description: 'Memoria heap usada por el proceso Node.js',
    unit: 'bytes',
});

memoryUsage.addCallback((observableResult) => {
    observableResult.observe(process.memoryUsage().heapUsed);
});

export { sdk, meter, prometheusExporter };
