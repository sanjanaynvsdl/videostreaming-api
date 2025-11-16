export default {
    async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext) {
        console.log(`Received batch from queue: ${batch.queue}`);
        console.log(batch.messages.length);
        console.log("===================================");

        for (const msg of batch.messages) {
            console.log("Message:", msg.id, msg.body);
            const body = msg.body;
             const key = body?.object?.key;

            try {
                const response = await fetch("https://videostreaming-api.onrender.com/api/queue/worker", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key }),
                });

                const data = await response.json().catch(() => null);
                console.log(`Successfully sent to backend: `+data);


                if (!response.ok) {
                    console.error(`Backend failed with status ${response.status}`);
                    //do not ack, as cf will retry
                    continue;
                }

                msg.ack(); // mark as processed
            } catch (error) {
                console.error("Server Error : " + error);

            }
        }
    }
}

export interface Env { }

//Each object from the batch of messages, 
//on each object i need to send a post call to the backend api
/*
Queue videostream (1 message) - Ok @ 11/7/2025, 2:46:06 PM
  (log) Received batch from queue: videostream
  (log) Message: 2b6f4b6c216767a72970d45c66293114 {
  account: 'a54b12fe3ef06df16ff0041d79c18fc0',
  bucket: 'test',
  eventTime: '2025-11-07T14:45:04.116Z',
  action: 'PutObject',
  object: {
    key: 'uploads/590ec99d-9986-499a-88be-87db8bc146ec/1762526687851-example.mp4',
    size: 1859823,
    eTag: '2e652117c56609a08d31f5d99018a1bd'
  }
}
*/

// New file → R2 → event → Queue → Worker receives → you process → ack
