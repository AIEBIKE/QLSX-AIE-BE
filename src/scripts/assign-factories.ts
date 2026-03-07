import mongoose from "mongoose";
import dotenv from "dotenv";
import Factory from "../modules/factories/factory.model";
import Supervisor from "../modules/supervisors/supervisor.model";
import Worker from "../modules/workers/worker.model";


dotenv.config();

const assignFactories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log("Connected to MongoDB");

        const factories = await Factory.find();
        if (factories.length === 0) {
            console.log("No factories found. Please create factories first.");
            process.exit(0);
        }

        console.log(`Found ${factories.length} factories.`);

        // Assign to Supervisors
        const supervisors = await Supervisor.find();
        let updatedSupervisors = 0;
        for (const supervisor of supervisors) {
            const randomFactory = factories[Math.floor(Math.random() * factories.length)];
            supervisor.factory_belong_to = randomFactory._id;
            await supervisor.save();
            updatedSupervisors++;
        }
        console.log(`Updated ${updatedSupervisors} Supervisors.`);

        // Assign to Workers
        const workers = await Worker.find();
        let updatedWorkers = 0;
        for (const worker of workers) {
            const randomFactory = factories[Math.floor(Math.random() * factories.length)];
            worker.factoryId = randomFactory._id;
            await worker.save();
            updatedWorkers++;
        }
        console.log(`Updated ${updatedWorkers} Workers.`);

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

assignFactories();
