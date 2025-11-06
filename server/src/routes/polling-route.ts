import express from "express";
import { processVideo } from "../utils/video-processing.js";
import prisma from "../clients/prisma-client.js";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import s3Client from "../clients/aws-client.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import { acknowledgeMessage } from "../utils/video-processing.js";
import cf from "../clients/cloudflare-client.js";

const router = express.Router();

const QUEUES_API_TOKEN = process.env.CF_QUEUES_API_TOKEN!;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const QUEUE_ID = process.env.CF_QUEUE_ID!;
const BUCKET_NAME = process.env.R2_BUCKET!;



//1. pull messages from queue
router.post("/consume-queue", async (req, res) => {
    try {

        // const response = await cf.queues.messages.pull(QUEUE_ID,{
        //     account_id:CF_ACCOUNT_ID,
        //     batch_size:10,
        //     visibility_timeout_ms:6000,
        // });

        const { messages = [] } = await cf.queues.messages.pull(QUEUE_ID, {
            account_id: CF_ACCOUNT_ID,
            batch_size: 10,
            visibility_timeout_ms: 6000,
        });

        // const messages = response.result?.messages ?? [];
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
            const userId = objectKey.sp

            if (!objectKey?.startsWith("uploads/")) {
                console.log("Skipping", objectKey);
                continue;
            }

            if (!message.lease_id) {
                console.error("This message doesn't have the lease_id", message);
                continue;
            }

            //acknowledge each message
            const responseAck = await cf.queues.messages.ack(QUEUE_ID, {
                account_id: CF_ACCOUNT_ID,
                acks: [
                    { lease_id: message.lease_id }
                ]
            });

            console.log("Message ack : " + JSON.stringify(responseAck, null, 2));

            // try {
            //     await processVideo()
            // } catch (error) {

            // }

            

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