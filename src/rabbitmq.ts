import client, { Connection } from "amqplib";

export class RabbitMQConnection {

  public constructor(private queue: string) {}

  public enqueue = async (message: any) => {
    const connection = await client.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue(this.queue, { durable: false });
    channel.sendToQueue(this.queue, Buffer.from(message));
    console.log(`Sent: ${message}`);

    setTimeout(() => {
      channel.close();
      connection.close();
    }, 1000);
  };

  public dequeue = async () => {
    const connection = await client.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue(this.queue, { durable: false });
    console.log("Waiting for messages in queue...");

    channel.consume(this.queue, (message) => {
      if (message) {
        console.log(`Received: ${message.content.toString()}`);
        channel.ack(message);
      }
    });

    setTimeout(() => {
      channel.close();
      connection.close();
    }, 1000);
  };
}
