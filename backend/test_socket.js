const io = require("socket.io-client");
const fetch = require("node-fetch"); // Use native fetch if node 18+

// Helper script to connect to the backend as a test driver and see if new_order is emitted.
async function listenAsDriver() {
  try {
    // 1. Get a token for check1
    const res = await fetch("http://localhost:5000/api/v1/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "check1", role: "DRIVER" })
    });
    const data = await res.json();
    if (!data.token) {
      console.error("Login failed", data);
      return;
    }
    const token = data.token;
    
    // 2. Connect socket
    const socket = io("http://localhost:5000", {
      auth: { token }
    });
    
    socket.on("connect", () => {
      console.log("Socket connected! ID:", socket.id);
      
      // Go online via API
      fetch("http://localhost:5000/api/v1/drivers/6a453f1fecb0e2672c8b06b1/status", { // Wait, driverId from test query? We don't have it easily. Let's just listen.
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: "ONLINE", isAvailable: true })
      }).then(r => r.json()).then(console.log).catch(console.error);
    });
    
    socket.on("new_order", (order) => {
      console.log("RECEIVED new_order EVENT!", order);
    });
    
    socket.on("disconnect", () => console.log("Disconnected"));
    
  } catch (err) {
    console.error(err);
  }
}

listenAsDriver();
