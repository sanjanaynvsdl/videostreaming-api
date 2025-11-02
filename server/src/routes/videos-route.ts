import express from "express";
import multer from "multer";
import fs from "fs";
import { processVideo } from "../utils/video-processing.js";
import prisma from "../clients/prisma-client.js";
import { authenticateToken } from "../middleware/middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload and process video
router.post("/upload",authenticateToken, upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file provided" });
  }
//req.file has this feilds attched with the help of multer
/* {
    fieldname: 'video',
    originalname: 'myclip.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    destination: 'uploads/',
    filename: 'aa04a4f2dc58c.mp4', 
    path: 'uploads/aa04a4f2dc58c.mp4',
    size: 2845000
}*/

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const key = `videos/${Date.now()}_${req.file.originalname}`;
    const video = await prisma.video.create({
      data: {
        userId,
        key,
        status: "processing",
      },
    });

    //process, upload
    const { manifests } = await processVideo(req.file.path, String(video.id));

    // Update DB with manifest url,
    await prisma.video.update({
      where: { id: video.id },
      data: {
        manifestUrl: manifests.master!,
        status: "completed",
      },
    });

    //delte temp file,
    fs.unlinkSync(req.file.path);

    res.json({
      videoId: video.id,
      manifestUrl: manifests.master,
      message: "Video uploaded and processed successfully",
    });
  } catch (err) {

    console.error("Video processing failed:", err);
    res.status(500).json({ error: "Video processing failed" });
  }
});

// Fetch manifest URL
router.get("/:id/manifest", async (req, res) => {
  const video = await prisma.video.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  res.json({ manifestUrl: video.manifestUrl });
});

export default router;
