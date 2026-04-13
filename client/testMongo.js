const { MongoClient } = require("mongodb");
const fs = require("fs");
const envFile = fs.readFileSync(".env.local", "utf8");
const uriMatch = envFile.match(/MONGODB_URI="?([^"\n]+)"?/);
const uri = uriMatch ? uriMatch[1] : null;

if (!uri) {
  console.error("NO MONGODB_URI FOUND IN .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");
    await client.db("admin").command({ ping: 1 });
    console.log("Ping successful.");
  } catch (err) {
    console.error("Failed to connect to MongoDB. Error details:", err.message);
  } finally {
    await client.close();
  }
}

run();
