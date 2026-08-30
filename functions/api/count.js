// GET /api/count -> public running total of signatures, for the live tally on the page.
// No personal data returned here — just a number — so this endpoint is intentionally open.

export async function onRequestGet(context) {
  const { env } = context;
  const list = await env.PETITION_KV.list({ prefix: "sig:" });
  return new Response(JSON.stringify({ count: list.keys.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
