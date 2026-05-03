const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:8000/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 'b321a0bd-3e81-420b-8d07-2a41d6b1d4ea', unit_id: 'node/12345' })
  });
  console.log(await res.text());
}
test();
