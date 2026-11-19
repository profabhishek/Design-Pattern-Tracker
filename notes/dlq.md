# Dead Letter Queue (DLQ)

**In one line:** If a message keeps failing after several retries, **move it to a separate "dead letter" queue** so it doesn't block the others. Someone can check and replay it later.

---

## 1. Real-life example

The **post office** gets a letter with a wrong address. They try delivering a few times. Then they put it in the "**undeliverable letters**" box instead of trying forever. Someone checks that box later.

## 2. What problem does it solve?

A **poison message** is a message that will **always** fail (bad JSON, missing field, bug in code).

Without a DLQ:
- The consumer retries it forever → the queue is **stuck**, good messages behind it wait.
- Or the consumer skips it → **data is lost** silently.

With a DLQ: retry a few times, then park it safely, alert the team, keep processing others.

## 3. Flow

```diagram
caption: How a message ends up in the DLQ
flow: [Main topic | orders]{accent} -> [Consumer] -> (fails) [Retry 1, 2, 3 | with backoff]{warn} -> (still failing) [Dead letter topic | orders.DLT]{fail} -> [Alert and fix | then replay it]{good}
```

## 4. Spring Boot – Kafka (build task: move to DLQ after N retries)

```java
@Configuration
public class KafkaErrorConfig {

    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
        // send failed record to "<topic>.DLT", same partition
        var recoverer = new DeadLetterPublishingRecoverer(template);

        // 3 retries: wait 1s, 2s, 4s
        var backoff = new ExponentialBackOffWithMaxRetries(3);
        backoff.setInitialInterval(1000);
        backoff.setMultiplier(2);

        var handler = new DefaultErrorHandler(recoverer, backoff);
        // these will never succeed → go to DLT immediately, no retries
        handler.addNotRetryableExceptions(JsonProcessingException.class, IllegalArgumentException.class);
        return handler;
    }
}
```

Spring Boot auto-wires a `DefaultErrorHandler` bean into the listener container.

```java
@Component
@Slf4j
public class OrderConsumer {

    @KafkaListener(topics = "orders", groupId = "billing")
    public void consume(OrderEvent event) {
        if (event.amount() < 0) throw new IllegalArgumentException("Negative amount");
        log.info("Billing order {}", event.orderId());
    }

    @KafkaListener(topics = "orders.DLT", groupId = "billing-dlt")
    public void dlt(ConsumerRecord<String, OrderEvent> rec,
                    @Header(KafkaHeaders.DLT_EXCEPTION_MESSAGE) String error) {
        log.error("DEAD LETTER: key={} error={}", rec.key(), error);
        // save to a table, send Slack/email alert, etc.
    }
}
```

### Even simpler: `@RetryableTopic` (non-blocking retries)

```java
@RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 2))
@KafkaListener(topics = "orders", groupId = "billing")
public void consume(OrderEvent event) { ... }

@DltHandler
public void handleDlt(OrderEvent event, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
    log.error("Moved to DLT from {}: {}", topic, event);
}
```

This creates retry topics (`orders-retry-0`, ...) so the main topic keeps flowing while failed messages wait.

### RabbitMQ version (short)

```java
@Bean
Queue ordersQueue() {
    return QueueBuilder.durable("orders")
            .withArgument("x-dead-letter-exchange", "")
            .withArgument("x-dead-letter-routing-key", "orders.dlq")
            .build();
}
@Bean Queue ordersDlq() { return QueueBuilder.durable("orders.dlq").build(); }
```

```properties
spring.rabbitmq.listener.simple.retry.enabled=true
spring.rabbitmq.listener.simple.retry.max-attempts=3
spring.rabbitmq.listener.simple.default-requeue-rejected=false
```

## 5. Replay

After fixing the bug, send DLQ messages back to the main topic:

```java
@PostMapping("/admin/dlt/replay")
public void replay() {
    // read records from orders.DLT (e.g. with a KafkaConsumer) and:
    // kafkaTemplate.send("orders", record.key(), record.value());
}
```

Consumers must be **idempotent**, because replayed messages may have been partly processed before.

## 6. Points to explain in an interview

- **Poison messages:** messages that can never succeed; don't retry those (non-retryable exceptions).
- **Replay:** after a fix, move messages back; needs idempotent consumers.
- **Alerting:** a DLQ nobody watches = silent data loss. Add metrics/alerts on DLQ size.
- Keep error details in headers (exception, original topic, offset) to debug.

## 7. Quick revision

- Retry N times with backoff → then DLQ.
- Don't block the main queue; don't lose data.
- Monitor, alert, fix, replay.
