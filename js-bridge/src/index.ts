import { AutoRouter as Router } from 'itty-router';
import { trace, context, SpanStatusCode, SpanKind, Tracer} from '@opentelemetry/api';
import * as SemanticConventions from '@opentelemetry/semantic-conventions';
import { getTracer } from './tracer';

let router = Router();


router
  .post("/v1/api/datastream2", async (req) => {
    const body = await req.text();

    // Print metadata about the number of log entries, and randomly print one to the logs.
    console.log(`Received entry of size ${body.length}.`);

    const lines = body.split("\n");

    const {tracer, provider} = getTracer();

    for (const line of lines) {
      if (line) {
        try{
          
          handleLine(line, tracer);
          
        } catch (error) {
          console.error(error)
          console.log (`error line ${line}`);
        }
      }
    }
    
    await provider.forceFlush();

    return new Response("OK");
  })

//@ts-ignore

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(router.fetch(event.request));
});

function handleLine(line: string, tracer: Tracer) {
  const parsedLine = JSON.parse(line);

  let customField = parsedLine.customField as string;
  let parsedCustomField = new URLSearchParams(customField);

  let debug = false
  if (parsedLine.reqPath == "api/products/OLJCESPC7Z") {debug = true}

  if (debug) {console.log("debugging request")}

  let startTimeMillis = parseInt(parsedLine.reqTimeSec as string)*1000;

  let ms = parseInt(parsedCustomField.get("ms") as string)
  if (!isNaN(ms)) {
    startTimeMillis = ms
  }


  
  let tlsOverheadTimeMillis = parseInt(parsedLine.tlsOverheadTimeMSec as string) || 0;
  let reqEndTimeMillis = parseInt(parsedLine.reqEndTimeMSec as string) || 0;
  let turnAroundTimeMillis = parseInt(parsedLine.turnAroundTimeMSec as string) || 0;
  let transferTimeMillis = parseInt(parsedLine.transferTimeMSec as string) || 0;
  let endTimeMillis = startTimeMillis + reqEndTimeMillis + turnAroundTimeMillis + transferTimeMillis;


  let traceId = parsedCustomField.get("tid");
  let spanId = parsedCustomField.get("sid");
  let parentSpanId = parsedCustomField.get("pid");

  if (debug) {console.log(`tid: ${traceId}, pid: ${parentSpanId}, sid: ${spanId}`)}

  if (traceId && spanId) {
    let parentContext;

    if (parentSpanId) {
      const parentSpanContext = {
        traceId,
        spanId: parentSpanId,
        traceFlags: 1, // sampled
        isRemote: true,
      };

      parentContext = trace.setSpanContext(context.active(), parentSpanContext);
    }

    if (debug) {console.log(`tid: ${traceId}, after parent context`)}
    let span = tracer.startSpan(
      `HTTP ${parsedLine.reqMethod ?? "request"}`, 
      {
        kind: SpanKind.SERVER,
        startTime: startTimeMillis,
        attributes: {
          [SemanticConventions.ATTR_HTTP_REQUEST_METHOD] : parsedLine.reqMethod,
          [SemanticConventions.ATTR_URL_PATH] : "/" + parsedLine.reqPath,
          [SemanticConventions.ATTR_SERVER_ADDRESS] : parsedLine.reqHost,
          [SemanticConventions.ATTR_CLIENT_ADDRESS]: parsedLine.cliIP,
          [SemanticConventions.ATTR_HTTP_RESPONSE_STATUS_CODE]: parsedLine.statusCode,
          [SemanticConventions.ATTR_NETWORK_LOCAL_ADDRESS]: parsedLine.edgeIP,
          "akamai.cpcode": parsedLine.cp

        },
        root: !parentContext
      },
      parentContext
    );
    if (debug) {console.log(`tid: ${traceId}, after start span`)}
    
    if (debug) {console.log(`tid: ${traceId}, in spanid check`)}
    const spanContext = span.spanContext()
    spanContext.spanId = spanId;
    spanContext.traceId = traceId;
    

    span.addEvent("requestHeadersProcessed", startTimeMillis + reqEndTimeMillis)
    span.addEvent("firstByteSent", startTimeMillis + reqEndTimeMillis + turnAroundTimeMillis)
    if (tlsOverheadTimeMillis > 0) {
      span.addEvent("tlsConnectionComplete", startTimeMillis + tlsOverheadTimeMillis)
    }
    if (debug) {console.log(`tid: ${traceId}, after events added`)}
    if (parsedLine.errorCode && parsedLine.errorCode != "-") {
      span.setStatus({code: SpanStatusCode.ERROR, message: parsedLine.errorCode})
    }

    span.end(endTimeMillis)
    if (debug) {console.log(`tid: ${traceId}, after end span`)}
    console.debug("added span")
  }

}