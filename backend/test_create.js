async function testHelperCreation() {
  try {
    // 1. Get a token for user
    const loginRes = await fetch("http://192.168.31.113:5000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9999999999", role: "USER" })
    });
    
    if (!loginRes.ok) {
       console.error("Login failed", await loginRes.text());
       return;
    }
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error("No token");
    
    // 2. Create helper order
    const createRes = await fetch("http://192.168.31.113:5000/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${loginData.token}` },
      body: JSON.stringify({
        serviceType: "helper",
        stops: [{
          sequence: 1,
          type: "pickup",
          address: "123 Main St",
          lat: 12.9716,
          lng: 77.5946,
          instructions: "Help me move a box"
        }],
        duration: 1,
        totals: {
          total: 150
        }
      })
    });
    
    const responseBody = await createRes.text();
    console.log("Status:", createRes.status);
    console.log("Response:", responseBody);
  } catch(e) {
    console.error(e);
  }
}
testHelperCreation();
