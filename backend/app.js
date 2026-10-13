import express from 'express';
import authRoutes from './routes/auth.js';
import sequelize from './config/db.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import listRoutes from './routes/listRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import labelRoutes from './routes/labelRoutes.js';
import cardResourceRoutes from './routes/cardResourceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';
import { errorMiddleware, notFound } from './middleware/errorMiddleware.js';
import './models/index.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "7mb" }));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes); 
app.use("/api/workspaces", workspaceRoutes);  
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api", labelRoutes);
app.use("/api", cardResourceRoutes);
app.use(notFound);
app.use(errorMiddleware);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected through Sequelize");
    app.listen(port, () => {
      console.log(`TaskFlow API is running on port ${port}`);
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
