// POST /api/signatures  -> add a new signature (public, called from the signing form)
// GET  /api/signatures?passcode=xxx -> list all signatures (organiser only)
//
// Requires a KV namespace bound as PETITION_KV, and a secret env var ADMIN_PASSCODE.
// Set both up in the Cloudflare Pages dashboard (Settings -> Functions -> KV bindings,
// and Settings -> Environment variables).

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid request body" }, 400);
  }

  const fullName = (body.fullName || "").toString().trim();
  const address = (body.address || "").toString().trim();
  const tenure = (body.tenure || "").toString().trim();
  const sigDate = (body.sigDate || "").toString().trim();
  const signatureImage = (body.signatureImage || "").toString();

  if (!fullName || !address || !tenure || !sigDate || !signatureImage) {
    return json({ error: "Missing required fields" }, 400);
  }
  // Basic sanity limits so no one can dump huge payloads into KV
  if (fullName.length > 200 || address.length > 400 || tenure.length > 200) {
    return json({ error: "Field too long" }, 400);
  }
  if (signatureImage.length > 300000) {
    return json({ error: "Signature image too large" }, 400);
  }

  const id = crypto.randomUUID();
  const entry = {
    id,
    fullName,
    address,
    tenure,
    sigDate,
    signatureImage,
    submittedAt: new Date().toISOString()
  };

  await env.PETITION_KV.put(`sig:${id}`, JSON.stringify(entry));

  const list = await env.PETITION_KV.list({ prefix: "sig:" });
  return json({ ok: true, id, count: list.keys.length });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const passcode = url.searchParams.get("passcode") || "";

  if (!env.ADMIN_PASSCODE || passcode !== env.ADMIN_PASSCODE) {
    return json({ error: "Invalid passcode" }, 401);
  }

  const list = await env.PETITION_KV.list({ prefix: "sig:" });
  const rows = [];
  for (const key of list.keys) {
    const value = await env.PETITION_KV.get(key.name);
    if (value) rows.push(JSON.parse(value));
  }
  rows.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  return json({ rows });
}
