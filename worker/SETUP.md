1. npm init -y
2. npm install -D wrangler typescript @cloudflare/workers-types
3. npx tsc --init
4. created wrangler.toml 
 - configured the cloudflare tokens

 ```sh
 export CLOUDFLARE_API_TOKEN="ur_token"
 export CLOUDFLARE_ACCOUNT_ID="acc_id"

 #check
 npx wrangler whoami
 ```

- as we want to consume the messages from the queue, we will have a qeueu worker

1. create a queue consumer
2. configure the settings on wrangeler.toml
3. wrangler deploy


[https://developers.cloudflare.com/queues/reference/how-queues-works/#consumers](https://developers.cloudflare.com/queues/reference/how-queues-works/#consumers)
<br/>
[https://developers.cloudflare.com/queues/configuration/configure-queues/](https://developers.cloudflare.com/queues/configuration/configure-queues/)
<br/>
[https://developers.cloudflare.com/queues/platform/limits/](https://developers.cloudflare.com/queues/platform/limits/)

<br/>
- deployed as
[https://videostream-consumer.everyai-com.workers.dev](https://videostream-consumer.everyai-com.workers.dev)


