// elektron-moq-safari: static assets (public/) + a beacon sink so any device
// running the test page (an iPhone in someone's hand, a locked-screen Safari)
// is observable from `wrangler tail elektron-moq-safari`.
export default {
	async fetch(request) {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/beacon") {
			const text = (await request.text()).slice(0, 4000);
			console.log("BEACON", text);
			return new Response(null, { status: 204 });
		}
		return new Response("not found", { status: 404 });
	},
};
