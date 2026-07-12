import axios from "axios";

async function run() {
  const ticketIds = [
    "019f5792-a941-762e-bb3a-91a6dbcdb8af", // Customer ticket
    "019f5792-ad8a-731f-8285-45d4fe2b3be6"  // Driver ticket
  ];
  
  console.log("Fetching receipts from Expo...");
  const response = await axios.post(
    "https://exp.host/--/api/v2/push/getReceipts",
    { ids: ticketIds },
    {
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
    }
  );
  
  console.log("Raw Receipts Response:", JSON.stringify(response.data, null, 2));
}

run().catch(console.error);
