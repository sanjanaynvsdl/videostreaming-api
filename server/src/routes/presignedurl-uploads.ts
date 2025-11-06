import express from "express";
// import { AwsClient } from "aws4fetch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../clients/aws-client.js";

import { authenticateToken } from "../middleware/middleware.js";

const router = express.Router();

// const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
// const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
// const ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const BUCKET_NAME = process.env.R2_BUCKET!;

// const client = new AwsClient({
//   accessKeyId: ACCESS_KEY_ID,
//   secretAccessKey: SECRET_ACCESS_KEY,
// });

router.get("/presigned-url", authenticateToken, async (req, res) => {
  const userId = req?.userId;
  const filename = req.query.filename as string;

  if (!filename) {
    return res.status(400).json({ message: "Filename query parameter is required" });
  }

  const key = `uploads/${userId}/${Date.now()}-${filename}`;
  try {

    // //build url
    // const url = new URL(`https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com`);
    // url.pathname = `/${key}`; 

    // //expiry 1hr
    // url.searchParams.set("X-Amz-Expires", "3600");

    // //sign to get pre-digned url,
    // const signedRequest = await client.sign(
    //   new Request(url.toString(), { method: "PUT" }),
    //   { aws: { signQuery: true } }
    // );

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ uploadUrl: uploadUrl, key });
    
  } catch (error) {

    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: "Failed to generate presigned URL" });
  }
});

export default router;
