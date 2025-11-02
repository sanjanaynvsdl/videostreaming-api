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

  const key = `uploads/${userId}/${Date.now()}-${filename}`;
  try {

    //build url
    const url = new URL(`https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com`);
    url.pathname = `/${key}`; 

    //expiry 1hr
    url.searchParams.set("X-Amz-Expires", "3600");

    //sign to get pre-digned url,
    const signedRequest = await client.sign(
      new Request(url.toString(), { method: "PUT" }),
      { aws: { signQuery: true } }
    );


    res.json({ uploadUrl: signedRequest.url, key });
  } catch (error) {

    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: "Failed to generate presigned URL" });
  }
});

export default router;
