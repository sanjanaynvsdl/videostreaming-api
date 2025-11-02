import ffmpeg from "fluent-ffmpeg";
import {  PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import s3Client from "../clients/aws-client.js";



const BUCKET_NAME = process.env.R2_BUCKET!;


export async function uploadToR2(key: string, fileBuffer: Buffer) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: "application/octet-stream",
  });
  await s3Client.send(command);
}

// Utility to upload local file to R2
export async function uploadFileToR2FromPath(key: string, filePath: string) {
  const fileBuffer = fs.readFileSync(filePath);
  await uploadToR2(key, fileBuffer);
}

// Transcode video to multiple resolutions and segment to HLS chunks
export async function processVideo(filePath: string, videoId: string): Promise<{ manifests: Record<string, string> }> {
  const resolutions = [
    { name: "720p", width: 1280, height: 720, bitrate: "2500k" },
    { name: "480p", width: 854, height: 480, bitrate: "1400k" },
    { name: "360p", width: 640, height: 360, bitrate: "800k" },
  ];

  const outputDir = path.join("tmp", videoId);
  fs.mkdirSync(outputDir, { recursive: true });



  for (const { name, width, height, bitrate } of resolutions) {
  const resDir = path.join(outputDir, name);
  await fs.promises.mkdir(resDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        `-vf scale=${width}:${height}`,
        "-c:a aac",
        "-ar 48000",
        "-c:v h264",
        "-profile:v main",
        `-b:v ${bitrate}`,
        "-maxrate 3000k",
        "-bufsize 6000k",
        "-sc_threshold 0",
        "-g 48",
        "-keyint_min 48",
        "-hls_time 4",
        "-hls_playlist_type vod",
        `-hls_segment_filename ${path.join(resDir, "segment_%03d.ts")}`,
      ])
      .output(path.join(resDir, "index.m3u8"))
      .on("stderr", data => console.log(`[${name}]`, data.toString())) // logs
      .on("end", () => {
        console.log(`${name} transcoded successfully ✅`);
        resolve();
      })
      .on("error", err => reject(err))
      .run();
  });
}


/*
  tmp/videoI/720p/ //all resolutions are generated and loop through each
  segment_001.ts
  segment_002.ts
  index.m3u8 

*/

  // Upload all segments and manifests to R2
  for (const res of resolutions) {
    const resDir = path.join(outputDir, res.name);
    const files = fs.readdirSync(resDir); 
    //files -> ['segment_001.ts', 'segment_002.ts', 'index.m3u8']
    //loops through files, fullpath = "tmp/videoId/720p/segment_001.ts"
    //creates key. -> used for r2

    for (const file of files) {
      const fullPath = path.join(resDir, file); 
      const key = `videos/${videoId}/${res.name}/${file}`;
      const buffer = fs.readFileSync(fullPath); //reads local file as binary,
      await uploadToR2(key, buffer);
    }
  }

  // Generate master playlist manifest linking all resolutions
  let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";

  for (const res of resolutions) {
    masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate) * 1000},RESOLUTION=${res.width}x${res.height}\n`;
    masterPlaylist += `${res.name}/index.m3u8\n`;
  }

  // Upload master playlist
  await uploadToR2(`videos/${videoId}/master.m3u8`, Buffer.from(masterPlaylist));

  return { manifests: { master: `videos/${videoId}/master.m3u8` } };
}


