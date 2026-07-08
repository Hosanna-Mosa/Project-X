async function testPorts() {
  console.log("Checking which port is active...");
  const urls = [
    "http://127.0.0.1:5000/",
    "http://127.0.0.1:50000/",
    "http://127.0.0.1:5000/api/v1/vendors/nearby?lat=17.0005&lng=81.7840",
    "http://127.0.0.1:50000/api/v1/vendors/nearby?lat=17.0005&lng=81.7840"
  ];

  for (const url of urls) {
    try {
      console.log(`Querying: ${url}`);
      const response = await fetch(url);
      console.log(` -> Status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log(` -> Data:`, JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error(` -> Failed:`, error.message);
    }
  }
}

testPorts();
