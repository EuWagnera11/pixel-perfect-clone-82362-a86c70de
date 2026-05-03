Deno.serve(() => {
  const multi = Deno.env.get("FREEPIK_API_KEYS") || "";
  const single = Deno.env.get("FREEPIK_API_KEY") || "";
  return new Response(JSON.stringify({
    multi_count: multi ? multi.split(",").length : 0,
    multi_preview: multi.split(",").map((k) => k.trim().slice(0, 8) + "..."),
    single_set: !!single,
    single_preview: single ? single.slice(0, 8) + "..." : null,
  }), { headers: { "content-type": "application/json" } });
});
