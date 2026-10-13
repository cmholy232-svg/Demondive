// Lets the web build load a gzipped engine and game pack (engine-gz.wasm,
// game-gz.wasm) from hosts that cap file size or only serve known file types.
// Works whether or not the host already decompressed the file. The game pack
// may be split into numbered parts (game-gz-0.wasm, game-gz-1.wasm, ...) for
// hosts that cap each file; they are joined before unzipping.
(function () {
	var packed = { "index.wasm": "application/wasm", "index.pck": "application/octet-stream" };
	var gzipped = { "index.wasm": ["engine-gz.wasm"], "index.pck": __PCK_PARTS__ };
	var realFetch = window.fetch.bind(window);
	function grab(url) {
		return realFetch(url).then(function (response) {
			if (!response.ok) throw new Error("Could not load " + url);
			return response.arrayBuffer();
		});
	}
	window.fetch = function (input, init) {
		var url = typeof input === "string" ? input : input.url;
		var name = url.split("?")[0].split("/").pop();
		if (!packed[name]) return realFetch(input, init);
		return Promise.all(gzipped[name].map(function (part) { return grab(url.replace(name, part)); }))
			.then(function (pieces) {
				var size = pieces.reduce(function (n, p) { return n + p.byteLength; }, 0);
				var joined = new Uint8Array(size);
				var at = 0;
				pieces.forEach(function (p) { joined.set(new Uint8Array(p), at); at += p.byteLength; });
				return joined.buffer;
			})
			.then(function (buffer) {
				var bytes = new Uint8Array(buffer, 0, 2);
				var stream = new Blob([buffer]).stream();
				if (bytes[0] === 0x1f && bytes[1] === 0x8b) stream = stream.pipeThrough(new DecompressionStream("gzip"));
				return new Response(stream, { status: 200, headers: { "Content-Type": packed[name] } });
			});
	};
})();
