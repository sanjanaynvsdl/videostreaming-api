import express from "express";
import { processVideo } from "../utils/video-processing.js";
import prisma from "../clients/prisma-client.js";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import s3Client from "../clients/aws-client.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import cf from "../clients/cloudflare-client.js";


const router = express.Router();
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const QUEUE_ID = process.env.CF_QUEUE_ID!;
const BUCKET_NAME = process.env.R2_BUCKET!;



//1. pull messages from queue
//2. download video and process -> upload segments to R2
//3. store the m3u8 master file on db
//4. acknowledge queue message

router.post("/consume-queue", async (req, res) => {
    try {

        const { messages = [] } = await cf.queues.messages.pull(QUEUE_ID, {
            account_id: CF_ACCOUNT_ID,
            batch_size: 10,
            visibility_timeout_ms: 6000,
        });
        //cf sdk directly gives messages from response -> data.result.message 
        console.log("Messages are : ", JSON.stringify(messages,null,2));

        if (!messages.length) {
            return res.json({
                success: true,
                message: "No messages to proccess"
            });
        }

        for (const message of messages) {
            const payload = JSON.parse(message.body!);
            const objectKey = payload.object?.key;
            
            if (!objectKey?.startsWith("uploads/")) {
                console.log("Skipping", objectKey);
                continue;
            }
            
            if (!message.lease_id) {
                console.error("This message doesn't have the lease_id", message);
                continue;
            }

            const userId = objectKey.split("/")[1];
            const tempFilePath = `/tmp/${Date.now()}-${path.basename(objectKey)}`;

            //get-obj from r2
            const obj = await s3Client.send(
                new GetObjectCommand({
                    Bucket:BUCKET_NAME,
                    Key:objectKey,
                })
            );

            await pipeline(obj.Body as any, createWriteStream(tempFilePath));

            const video = await prisma.video.create({
                data:{userId,
                    key:objectKey,
                    status:"processing",
                }
            });

            const {manifests} = await processVideo(tempFilePath,String(video.id));

            await prisma.video.update({
                where:{id:video.id},
                data:{manifestUrl:manifests.master!,
                    status:"completed",
                }
            });

            fs.unlinkSync(tempFilePath);


            //acknowledge each message after successfully process.
            const responseAck = await cf.queues.messages.ack(QUEUE_ID, {
                account_id: CF_ACCOUNT_ID,
                acks: [
                    { lease_id: message.lease_id }
                ]
            });

            console.log("Message ack : " + JSON.stringify(responseAck, null, 2));
        }
        return res.status(200).json({
                message: "Successfully proccessed and acknowledged!",
                processed: messages.length,
        });

    } catch (error) {
        console.error("Failed to poll and process : " + error);

        if (error instanceof Error) {
            return res.status(500).json({
                message: "Internal server error",
                error: error.message,
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            error: error
        });
    }
});


export default router;