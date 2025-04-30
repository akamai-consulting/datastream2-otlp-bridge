import {CompressionAlgorithm, createOtlpNetworkExportDelegate, IOtlpExportDelegate} from '@opentelemetry/otlp-exporter-base'
import { ISerializer } from '@opentelemetry/otlp-transformer';
import { OtlpFetchConfiguration } from './configuration/otlp-fetch-configuration';
import { createFetchExporterTransport } from './transport/fetch-exporter-transport'

export function createOtlpFetchExportDelegate<Internal, Response>(
    options: OtlpFetchConfiguration,
    serializer: ISerializer<Internal, Response>
  ): IOtlpExportDelegate<Internal> {
    return createOtlpNetworkExportDelegate(
      options, //TODO: make this configurable
      serializer,
      createFetchExporterTransport(options)
    );
  }