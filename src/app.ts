import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import listingRoutes from "./routes/listing.routes";
import savedRoomRoutes from "./routes/savedRoom.routes";
import bookingRoutes from "./routes/booking.routes";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const app: Application = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/rooms", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/saved-rooms",savedRoomRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: "NOT_FOUND" } });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error", code: "SERVER_ERROR" } });
});

export default app;