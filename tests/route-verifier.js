const routes = ['/', '/flat', '/daa', '/coa', '/simulation', '/documentation', '/about'];

async function testAll() {
  console.log('Testing Next.js routes:');
  for (const r of routes) {
    try {
      const res = await fetch('http://localhost:3000' + r);
      console.log(`  ${r.padEnd(16)} -> HTTP ${res.status}`);
      if (res.status !== 200) {
        const text = await res.text();
        console.error(`    Error snippet: ${text.slice(0, 300)}`);
      }
    } catch (err) {
      console.error(`  ${r.padEnd(16)} -> FAILED: ${err.message}`);
    }
  }

  console.log('\nTesting FastAPI endpoints:');
  const apiEndpoints = ['/api/health', '/api/daa/sample'];
  for (const ep of apiEndpoints) {
    try {
      const res = await fetch('http://127.0.0.1:8000' + ep);
      const data = await res.json();
      console.log(`  ${ep.padEnd(20)} -> HTTP ${res.status} | Data preview: ${JSON.stringify(data).slice(0, 80)}...`);
    } catch (err) {
      console.error(`  ${ep.padEnd(20)} -> FAILED: ${err.message}`);
    }
  }

  // Also test compression POST from node to confirm end-to-end payload handling
  try {
    const res = await fetch('http://127.0.0.1:8000/api/daa/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: ['FETCH', 'ADD', 'FETCH', 'HALT', 'ADD'] })
    });
    const result = await res.json();
    console.log(`  POST /api/daa/compress -> HTTP ${res.status} | Bits: ${result.bitstring} | Ratio: ${result.metrics.compression_ratio}`);
  } catch (err) {
    console.error(`  POST /api/daa/compress -> FAILED: ${err.message}`);
  }
}

testAll();
