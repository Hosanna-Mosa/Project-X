import axios from "axios";
import { performance } from "perf_hooks";
import * as fs from "fs";
import * as path from "path";

const API_URL = "http://localhost:5000/api/v1";

interface BenchmarkMetric {
  name: string;
  min: number;
  max: number;
  avg: number;
  p95: number;
  successRate: number;
  runs: number;
}

async function runBenchmark() {
  console.log("\n========================================================");
  console.log("🚀 STARTING LOGISTICS PLATFORM BENCHMARK AUTOMATION");
  console.log("========================================================\n");

  let token = "";

  // 1. Authenticate and get JWT Token
  try {
    console.log("🔑 Authenticating benchmark user...");
    const authRes = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone: "9999999999",
      code: "123456",
      role: "USER",
      name: "Benchmark User",
      password: "password123"
    });
    token = authRes.data.token;
    console.log("✅ Authenticated successfully.\n");
  } catch (err: any) {
    console.error("❌ Authentication failed. Make sure the backend server is running on port 5000.");
    if (err.response) {
      console.error("Server Error Response:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  const results: BenchmarkMetric[] = [];

  // Scenario A: Nearby Drivers radial query (100 runs)
  results.push(await runMetric(
    "Nearby Drivers Search (Radius: 5km)",
    100,
    async () => {
      // Simulate random coordinates in HiTech City area
      const lat = 17.4486 + (Math.random() - 0.5) * 0.05;
      const lng = 78.3489 + (Math.random() - 0.5) * 0.05;
      await client.get(`/drivers/nearby?latitude=${lat}&longitude=${lng}&radius=5000&vehicleType=car`);
    }
  ));

  // Scenario B: Multi-stop Routing Sequence Optimization (2 Stops - Pickup & Drop)
  results.push(await runMetric(
    "Route Optimization (2 Stops: 1 Pickup, 1 Drop)",
    50,
    async () => {
      await client.post("/orders", {
        stops: [
          { lat: 17.4486, lng: 78.3489, address: "McDonalds Hitech City", type: "pickup" },
          { lat: 17.4440, lng: 78.3500, address: "Raju Tiffin Center", type: "drop" }
        ],
        serviceType: "cab"
      });
    }
  ));

  // Scenario C: Multi-stop Routing Sequence Optimization (5 Stops)
  results.push(await runMetric(
    "Route Optimization (5 Stops: 1 Pickup, 3 Stops, 1 Drop)",
    20,
    async () => {
      await client.post("/orders", {
        stops: [
          { lat: 17.4486, lng: 78.3489, address: "McDonalds Hitech City", type: "pickup" },
          { lat: 17.4450, lng: 78.3450, address: "Kondapur Cross Rd", type: "stop" },
          { lat: 17.4500, lng: 78.3420, address: "Botanical Garden", type: "stop" },
          { lat: 17.4600, lng: 78.3480, address: "Hafeezpet", type: "stop" },
          { lat: 17.4440, lng: 78.3500, address: "Raju Tiffin Center", type: "drop" }
        ],
        serviceType: "cab"
      });
    }
  ));

  // Scenario D: Multi-stop Routing Sequence Optimization (10 Stops)
  results.push(await runMetric(
    "Route Optimization (10 Stops: 1 Pickup, 8 Stops, 1 Drop)",
    10,
    async () => {
      await client.post("/orders", {
        stops: [
          { lat: 17.4486, lng: 78.3489, address: "Start Hitech City", type: "pickup" },
          { lat: 17.4490, lng: 78.3510, address: "Stop 1", type: "stop" },
          { lat: 17.4510, lng: 78.3530, address: "Stop 2", type: "stop" },
          { lat: 17.4530, lng: 78.3550, address: "Stop 3", type: "stop" },
          { lat: 17.4550, lng: 78.3570, address: "Stop 4", type: "stop" },
          { lat: 17.4570, lng: 78.3590, address: "Stop 5", type: "stop" },
          { lat: 17.4590, lng: 78.3610, address: "Stop 6", type: "stop" },
          { lat: 17.4610, lng: 78.3630, address: "Stop 7", type: "stop" },
          { lat: 17.4630, lng: 78.3650, address: "Stop 8", type: "stop" },
          { lat: 17.4440, lng: 78.3500, address: "End Dropoff", type: "drop" }
        ],
        serviceType: "cab"
      });
    }
  ));

  // Write Results Report
  generateReport(results);
}

async function runMetric(
  name: string,
  runs: number,
  fn: () => Promise<void>
): Promise<BenchmarkMetric> {
  console.log(`⏱️  Running benchmark: "${name}" (${runs} iterations)...`);
  const latencies: number[] = [];
  let successCount = 0;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    try {
      await fn();
      successCount++;
      const end = performance.now();
      latencies.push(end - start);
    } catch (err: any) {
      const end = performance.now();
      latencies.push(end - start);
      console.warn(`⚠️ Run ${i + 1} failed: ${err.message}`);
    }
  }

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length || 0;
  
  // P95 calculation
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p95 = latencies[p95Idx] || max;
  const successRate = (successCount / runs) * 100;

  console.log(`📊 Result: Avg: ${avg.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms | Success Rate: ${successRate}%\n`);

  return { name, min, max, avg, p95, successRate, runs };
}

function generateReport(metrics: BenchmarkMetric[]) {
  const dateStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  let md = `# Automated Benchmark Performance Report\n\n`;
  md += `*Generated: ${dateStr}*\n\n`;
  md += `| Benchmark Scenario | Runs | Min (ms) | Max (ms) | Avg (ms) | p95 (ms) | Success Rate |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const m of metrics) {
    md += `| **${m.name}** | ${m.runs} | ${m.min.toFixed(2)} | ${m.max.toFixed(2)} | ${m.avg.toFixed(2)} | ${m.p95.toFixed(2)} | ${m.successRate.toFixed(1)}% |\n`;
  }

  const reportPath = path.join(__dirname, "../../../benchmark_results.md");
  fs.writeFileSync(reportPath, md);

  console.log("========================================================");
  console.log("🎉 BENCHMARK COMPLETED SUCCESSFULLY!");
  console.log(`📁 Report generated at: ${reportPath}`);
  console.log("========================================================\n");
}

runBenchmark().catch(console.error);
