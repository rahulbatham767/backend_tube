import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log("App is listening on port " + process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error: " + error);
  });
