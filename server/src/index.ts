import express from "express";
import "dotenv/config";
import userRoutes from "./routes/user-routes.js";
import uploadRoutes from "./routes/presignedurl-uploads.js";
import videoRoutes from "./routes/videos-route.js";

const app = express();
app.use(express.json());


console.log("got the req");
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/videos",videoRoutes);

const port = process.env.PORT || "3000";

app.listen(port,(err)=>{
    if(err) {
        console.log("Error while running a server! "+err);
    } else {
        console.log("Server is running at port " + port);
    }
});

