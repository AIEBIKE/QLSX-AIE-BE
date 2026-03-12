/**
 * Migration: Make ProductionStandards global (remove factory scoping)
 * Priority: Keep Factory B records, delete duplicates from other factories
 * 
 * Run: npx ts-node src/scripts/migrate-global-standards.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const standardsCol = db.collection("productionstandards");
  const factoriesCol = db.collection("factories");

  // 1. Find Factory B
  const factories = await factoriesCol.find({}).toArray();
  console.log("All factories:", factories.map(f => `${f.name} (${f.code}) - ${f._id}`));
  
  const factoryB = factories.find(f => 
    (f.name || "").toLowerCase().includes("b") || 
    (f.code || "").toLowerCase().includes("b")
  );
  
  if (!factoryB) {
    console.error("Factory B not found! Available:", factories.map(f => f.name));
    process.exit(1);
  }
  console.log(`\nUsing Factory B: ${factoryB.name} (${factoryB._id})`);

  // 2. Find all standards grouped by vehicleTypeId + operationId
  const allStandards = await standardsCol.find({}).toArray();
  console.log(`\nTotal standards: ${allStandards.length}`);

  const groups: Record<string, any[]> = {};
  for (const std of allStandards) {
    const key = `${std.vehicleTypeId}-${std.operationId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(std);
  }

  let kept = 0, deleted = 0;
  for (const [key, stds] of Object.entries(groups)) {
    if (stds.length <= 1) {
      kept++;
      continue;
    }

    // Priority: Factory B first, then keep the first one found
    const factoryBStd = stds.find(s => s.factoryId?.toString() === factoryB._id.toString());
    const keepStd = factoryBStd || stds[0];
    
    const deleteIds = stds
      .filter(s => s._id.toString() !== keepStd._id.toString())
      .map(s => s._id);

    if (deleteIds.length > 0) {
      await standardsCol.deleteMany({ _id: { $in: deleteIds } });
      deleted += deleteIds.length;
      console.log(`  [${key}] Kept ${keepStd._id} (factory ${keepStd.factoryId}), deleted ${deleteIds.length} duplicates`);
    }
    kept++;
  }

  console.log(`\nDone: Kept ${kept} unique standards, deleted ${deleted} duplicates`);

  // 3. Drop old unique index and create new one
  try {
    const indexes = await standardsCol.indexes();
    const oldIndex = indexes.find((idx: any) => 
      idx.key?.factoryId && idx.key?.vehicleTypeId && idx.key?.operationId
    );
    if (oldIndex) {
      await standardsCol.dropIndex(oldIndex.name!);
      console.log(`Dropped old index: ${oldIndex.name}`);
    }
  } catch (e: any) {
    console.log("No old index to drop:", e.message);
  }

  try {
    await standardsCol.createIndex(
      { vehicleTypeId: 1, operationId: 1 },
      { unique: true }
    );
    console.log("Created new unique index: {vehicleTypeId, operationId}");
  } catch (e: any) {
    console.error("Failed to create new index:", e.message);
  }

  await mongoose.disconnect();
  console.log("\nMigration complete!");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
