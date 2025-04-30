import { Variables } from "@fermyon/spin-sdk";
import { diag, DiagConsoleLogger, DiagLogLevel, trace, Tracer, TracerProvider } from "@opentelemetry/api";
import { BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "./exporter-otlp-trace-fetch";
import * as SemanticConventions from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

let tracer: Tracer;
let provider: BasicTracerProvider


function initTracer () {
  const OTLP_ENDPOINT = Variables.get("otlp_endpoint")
  const OTLP_TIMEOUT_MILLIS = parseInt(Variables.get("otlp_timeout_millis") || "30000")
  if (!OTLP_ENDPOINT) {
    throw new Error("otlp_endpoint must be provided")
  }

  const exporter = new OTLPTraceExporter({
    url: OTLP_ENDPOINT,
    timeoutMillis: OTLP_TIMEOUT_MILLIS,
    concurrencyLimit: 30,
    compression: 'none',
    headers: ()=>{return {'User-Agent': 'Otel Fetch Exporter/0.1'}}  
  });
  provider = new BasicTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        // The maximum queue size. After the size is reached spans are dropped.
        maxQueueSize: 1000,
        // The interval between two consecutive exports
        scheduledDelayMillis: 1000,
      })
    ],
    resource: resourceFromAttributes({
      [ SemanticConventions.ATTR_SERVICE_NAME ]: "akamai-cdn",
    })
  });
  
  trace.setGlobalTracerProvider(provider);
  tracer = trace.getTracer("akamai-ds2-otel-adapter", "0.0.1");
}

export function getTracer() {
  if (!tracer) {
    initTracer();
  }
  return {tracer: tracer, provider: provider};
}