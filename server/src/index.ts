import express from "express";
import "dotenv/config";
import userRoutes from "./routes/user-routes.js";
import uploadRoutes from "./routes/presignedurl-uploads.js";
import videoRoutes from "./routes/videos-route.js";
import queueMessages from "./routes/queue-messages.js";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(cors({
    origin:process.env.CLIENT_URL || "*",
    methods:["GET","POST","PUT","DELETE"],
    credentials:true,
}));

app.get("/", (req,res)=>{
    return res.status(200).json({
        message:"All Set, Server is running!"
    })
})
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/videos",videoRoutes);
app.use("/api/queue",queueMessages);

const port = process.env.PORT || "3000";

app.listen(port,(err)=>{
    if(err) {
        console.log("Error while running a server! "+err);
    } else {
        console.log("Server is running at port " + port);
    }
});

