import express from "express";
import { AwsClient } from "aws4fetch";
import { authenticateToken } from "../middleware/middleware.js";

const router = express.Router();

const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET_NAME = process.env.R2_BUCKET!;

const client = new AwsClient({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
});

router.get("/presigned-url", authenticateToken, async (req, res) => {
  const userId = req?.userId;
  const filename = req.query.filename as string;

  if (!filename) {
    return res.status(400).json({ message: "Filename query parameter is required" });
  }

  // Build object key with folder by user and timestamp + filename for uniqueness
  const key = `uploads/${userId}/${Date.now()}-${filename}`;

  try {
    // Build the complete raw URL to upload location
    const url = new URL(`https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com`);
    url.pathname = `/${key}`; // add leading slash before key

    // Set presigned URL expiry (1 hour)
    url.searchParams.set("X-Amz-Expires", "3600");

    // Sign the request URL to generate presigned URL for PUT upload
    const signedRequest = await client.sign(
      new Request(url.toString(), { method: "PUT" }),
      { aws: { signQuery: true } }
    );

    // Send presigned URL and key to client
    res.json({ uploadUrl: signedRequest.url, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: "Failed to generate presigned URL" });
  }
});

export default router;
