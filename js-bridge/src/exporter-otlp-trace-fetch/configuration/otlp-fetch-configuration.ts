import {OtlpSharedConfiguration} from '@opentelemetry/otlp-exporter-base'

export interface OtlpFetchConfiguration extends OtlpSharedConfiguration {
  url: string;
  headers: () => Record<string, string>;
}