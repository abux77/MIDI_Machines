// The browser uses compiled C, never a JavaScript reimplementation of Grids.
export async function loadEngine() {
  const response = await fetch(new URL('grids.wasm', import.meta.url));
  if (!response.ok) throw new Error(`Engine download failed (${response.status})`);
  const {instance} = await WebAssembly.instantiate(await response.arrayBuffer());
  return instance.exports;
}
