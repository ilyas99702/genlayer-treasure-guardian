async function test() {
  const sdk = await import('https://unpkg.com/genlayer-js@1.1.7/dist/index.js');
  console.log(Object.keys(sdk));
}
test();
