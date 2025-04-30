import { ExportResponse, IExporterTransport } from '@opentelemetry/otlp-exporter-base';
import { diag } from '@opentelemetry/api';
import { isExportRetryable, parseRetryAfterToMills } from '../is-export-retryable';

export interface FetchRequestParameters {
    url: string;
    headers: () => Record<string, string>;
  }

class FetchExporterTransport implements IExporterTransport {
  constructor(private _parameters: FetchRequestParameters) {}

  async send(data: Uint8Array, timeoutMillis: number): Promise<ExportResponse> {
    try {
      let response = await fetch(this._parameters.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this._parameters.headers()
        },
        body: data,
        // Implement timeout when AbortSignal is available: https://github.com/bytecodealliance/StarlingMonkey/pull/240
        //signal: AbortSignal.timeout(timeoutMillis)
      })
      
      if (response.ok) {
        console.debug("Sent traces")
        return { status: 'success' };
      } else if (isExportRetryable(response.status)) {
        const responseText = await response.text();
        console.error(`Retriable HTTP error sending traces: ${response.status} - ${responseText}`)
        const retryAfter = response.headers.get('Retry-After');
        return {
          status: 'retryable',
          retryInMillis: parseRetryAfterToMills(retryAfter),
        };
      } else {
        const responseText = await response.text();
        console.error(`Non-retriable HTTP error sending traces: ${response.status} - ${responseText}`)
        return {
          status: 'failure',
          error: new Error('Fetch request failed with non-retryable status'),
        };
      }
    } catch(error: unknown) {  
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`AbortError error sending traces: ${error}`)
          return {
            status: 'failure',
            error: new Error('Fetch request timed out'),
          };
        } else {
          console.error(`Error error sending traces: ${error}`)
          return {
            status: 'failure',
            error: new Error('Fetch request errored'),
          };
        }
      } else {
        console.error(`Unknown error sending traces: ${error}`)
        return {
          status: 'failure',
          error: new Error(`Unknown error occured: ${error}`),
        };
      }
    }
  }
  shutdown() {
    // intentionally left empty, nothing to do.
  }
}

export function createFetchExporterTransport(
  parameters: FetchRequestParameters
): IExporterTransport {
  return new FetchExporterTransport(parameters);
} 