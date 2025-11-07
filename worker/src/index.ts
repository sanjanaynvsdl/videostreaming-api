export default {
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext) {
    console.log(`Received batch from queue: ${batch.queue}`);
    for (const msg of batch.messages) {
      console.log("Message:", msg.id, msg.body);
      msg.ack(); // mark as processed for now
    }
  }
}

export interface Env {}
