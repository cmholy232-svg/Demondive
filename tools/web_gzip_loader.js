// Lets the web build load a gzipped engine and game pack (engine-gz.wasm,
// game-gz.wasm) from hosts that cap file size or only serve known file types.
// Works whether or not the host already decompressed the file.
(function () {
	var packed = { "index.wasm": "application/wasm", "index.pck": "application/octet-stream" };
	var gzipped = { "index.wasm": "engine-gz.wasm", "index.pck": "game-gz.wasm" };
	var realFetch = window.fetch.bind(window);
	window.fetch = function (input, init) {
		var url = typeof input === "string" ? input : input.url;
		var name = url.split("?")[0].split("/").pop();
		if (!packed[name]) return realFetch(input, init);
		return realFetch(url.replace(name, gzipped[name]), init)
			.then(function (response) {
				if (!response.ok) throw new Error("Could not load " + name);
				return response.arrayBuffer();
			})
			.then(function (buffer) {
				var bytes = new Uint8Array(buffer, 0, 2);
				var stream = new Blob([buffer]).stream();
				if (bytes[0] === 0x1f && bytes[1] === 0x8b) stream = stream.pipeThrough(new DecompressionStream("gzip"));
				return new Response(stream, { status: 200, headers: { "Content-Type": packed[name] } });
			});
	};
})();
