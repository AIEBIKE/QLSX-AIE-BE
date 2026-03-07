const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const roles = await db.collection("roles").find().toArray();
  for (const r of roles) {
    console.log(`Role: ${r._id} | code: ${r.code} | name: ${r.name}`);
  }
  process.exit(0);
}
run();
