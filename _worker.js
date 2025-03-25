export default {
  async fetch(request, env) {
    return new Response("Hello from Workers!", {
      headers: { "content-type": "text/plain" },
    });
  },
}; 