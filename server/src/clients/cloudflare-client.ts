import Cloudflare from "cloudflare";

const QUEUES_API_TOKEN=process.env.CF_QUEUES_API_TOKEN!;

const cf = new Cloudflare({ apiToken: QUEUES_API_TOKEN });

export default cf;