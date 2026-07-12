async function runTest() {
  const rootUrl = "http://127.0.0.1:5000/";
  const checkUrl = "http://127.0.0.1:5000/api/v1/zones/check?lat=17.0005&lng=81.7840";

  console.log(`[${new Date().toISOString()}] 1. Fetching root URL...`);
  try {
    const res = await fetch(rootUrl);
    console.log(` -> Success! Status: ${res.status}`);
  } catch (err: any) {
    console.log(` -> Failed: ${err.message}`);
  }

  console.log(`[${new Date().toISOString()}] 2. Fetching check URL...`);
  try {
    const res = await fetch(checkUrl);
    console.log(` -> Success! Status: ${res.status}`);
  } catch (err: any) {
    console.log(` -> Failed: ${err.message}`);
  }

  // Wait 100ms
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log(`[${new Date().toISOString()}] 3. Fetching root URL again...`);
  try {
    const res = await fetch(rootUrl);
    console.log(` -> Success! Status: ${res.status}`);
  } catch (err: any) {
    console.log(` -> Failed: ${err.message}`);
  }
}

runTest();
