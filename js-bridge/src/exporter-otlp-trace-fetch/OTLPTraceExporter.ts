import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  OTLPExporterNodeConfigBase,
  OTLPExporterBase,
} from '@opentelemetry/otlp-exporter-base';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import { createOtlpFetchExportDelegate } from './otlp-fetch-export-delegate';
import { OtlpFetchConfiguration } from './configuration/otlp-fetch-configuration';


/**
 * Collector Trace Exporter for Node
 */
export class OTLPTraceExporter
  extends OTLPExporterBase<ReadableSpan[]>
  implements SpanExporter
{
  constructor(config: OtlpFetchConfiguration) {
    super(
      createOtlpFetchExportDelegate(
        config,
        JsonTraceSerializer
      )
    );
  }
}