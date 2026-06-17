import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env";

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log("Connected to MongoDB:", env.MONGO_URI);

  const passwordHash = await bcrypt.hash("admin123", 10);
  const username = "admin";

  const collections = [
    "hospitalusers",
    "receptionusers",
    "labusers",
    "pharmacyusers",
    "aestheticusers",
    "diagnosticusers",
    "financeusers",
    "indoorpharmacyusers",
    "dialysisusers",
  ];

  for (const col of collections) {
    const collection = mongoose.connection.collection(col);
    const existing = await collection.findOne({ username });
    if (existing) {
      await collection.updateOne(
        { username },
        { $set: { passwordHash, role: "admin", active: true } },
      );
      console.log(`Updated: ${col}`);
    } else {
      await collection.insertOne({
        username,
        passwordHash,
        role: "admin",
        active: true,
        createdAt: new Date(),
      });
      console.log(`Created: ${col}`);
    }
  }

  console.log("\nDone! Login with: admin / admin123");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
