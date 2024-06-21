import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, Credential: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

// routes
import userRouter from "./routes/user.routes.js";
import healthcheck from "./routes/healthcheck.routes.js";
import comment from "./routes/comment.routes.js";
import dashboard from "./routes/dashboard.routes.js";
import like from "./routes/like.routes.js";
import playlist from "./routes/playlist.routes.js";
import subscription from "./routes/subscription.route.js";
import tweet from "./routes/tweet.routes.js";
import video from "./routes/video.routes.js";

// routes Declaration
app.use("/api/v1/healthcheck", healthcheck);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweet);
app.use("/api/v1/subscriptions", subscription);
app.use("/api/v1/videos", video);
app.use("/api/v1/comments", comment);
app.use("/api/v1/likes", like);
app.use("/api/v1/playlist", playlist);
app.use("/api/v1/dashboard", dashboard);

export { app };
