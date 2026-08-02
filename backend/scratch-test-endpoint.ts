import axios from "axios";

async function test() {
  try {
    console.log("Logging in...");
    const loginRes = await axios.post("http://localhost:5000/api/v1/meat/login", {
      email: "meat.taj@example.com",
      password: "password123"
    });

    const { _id, token } = loginRes.data;
    console.log("Login successful! ID: " + _id);
    console.log("Token: " + token.substring(0, 20) + "...");

    console.log("Fetching vendor menu...");
    const menuRes = await axios.get(`http://localhost:5000/api/v1/meat/vendor-menu/${_id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Menu response status: " + menuRes.status);
    console.log("Items count: " + menuRes.data.length);
    console.log("Items:", menuRes.data);
  } catch (error: any) {
    console.error("Test failed:", error.response ? error.response.status + " - " + JSON.stringify(error.response.data) : error.message);
  }
}

test();
