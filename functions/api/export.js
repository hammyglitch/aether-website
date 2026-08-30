// GET /api/export?passcode=xxx -> download all signatures as a CSV file (organiser only)

function csvEscape(value) {
  return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const passcode = url.searchParams.get("passcode") || "";

  if (!env.ADMIN_PASSCODE || passcode !== env.ADMIN_PASSCODE) {
    return new Response(JSON.stringify({ error: "Invalid passcode" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const list = await env.PETITION_KV.list({ prefix: "sig:" });
  const rows = [];
  for (const key of list.keys) {
    const value = await env.PETITION_KV.get(key.name);
    if (value) rows.push(JSON.parse(value));
  }
  rows.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  let csv = "Name,Address,Tenure,Date\n";
  for (const r of rows) {
    csv += [csvEscape(r.fullName), csvEscape(r.address), csvEscape(r.tenure), csvEscape(r.sigDate)].join(",") + "\n";
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="pegasus-close-signatures.csv"'
    }
  });
}
