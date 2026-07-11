import app from "./app";
import { connectMongo } from "./lib/mongo";

const PORT = process.env.PORT;

async function start(): Promise<void> {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

void start();