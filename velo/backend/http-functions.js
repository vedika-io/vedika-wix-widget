/**
 * Wix Velo backend: backend/http-functions.js
 *
 * Exposes GET https://<your-site>/_functions/vedika/<route> for the Vedika
 * widgets. The Vedika API key is read from the Wix Secrets Manager (secret
 * name VEDIKA_API_KEY) on the server; it is never sent to the browser.
 *
 * Copy this file and vedika-proxy-core.js into your site's Backend folder.
 * If you already have an http-functions.js, add get_vedika to it.
 *
 * (c) Vedika Intelligence — https://vedika.io
 */
import { response } from 'wix-http-functions';
import { fetch } from 'wix-fetch';
import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import { planVedikaRequest } from 'backend/vedika-proxy-core';

// 'live': keyed requests billed to your Vedika account, using the VEDIKA_API_KEY secret.
// 'sandbox': Vedika's keyless mock data; no secret is read and nothing is billed.
const VEDIKA_MODE = 'live';

// Browser origins allowed to call this function: your site, plus the origin the
// HTML embed iframe runs on if you use one (copy it from the request's Origin
// header in your browser's network panel). Requests with any other Origin get 403.
// This is not access control: anyone can call the URL without a browser.
const ALLOWED_ORIGINS = ['https://www.example.com'];

const readSecret = elevate(secrets.getSecretValue);

export async function get_vedika(request) {
  let apiKey = null;
  if (VEDIKA_MODE === 'live') {
    try {
      apiKey = await readSecret('VEDIKA_API_KEY');
    } catch (error) {
      apiKey = null;
    }
  }
  const plan = planVedikaRequest(
    { path: request.path, query: request.query, origin: request.headers.origin || null },
    { mode: VEDIKA_MODE, apiKey, allowedOrigins: ALLOWED_ORIGINS }
  );
  if (plan.reject) {
    return response({ status: plan.reject.status, headers: plan.headers, body: plan.reject.body });
  }
  try {
    const upstream = await fetch(plan.url, { method: 'GET', headers: plan.upstreamHeaders });
    const body = await upstream.text();
    return response({ status: upstream.status, headers: plan.headers, body });
  } catch (error) {
    return response({ status: 502, headers: plan.headers, body: JSON.stringify({ error: 'upstream unavailable' }) });
  }
}
