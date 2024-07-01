import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import cors from 'cors';
dotenv.config({
  path: "./env",
});


const corsOptions = {
  origin: ["http://localhost:3000","*"],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};
app.use(cors(corsOptions));

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log("App is listening on port " + process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error: " + error);
  });
