# Notes – Design Patterns & Distributed Systems (Java Spring Boot)

Easy notes for all 32 topics in the [Pattern Sprint Tracker](../index.html). Each note has:

1. A one-line meaning and a real-life example
2. The problem it solves
3. Java / Spring Boot code (including the tracker's **Build** task)
4. When to use and when not to
5. The trade-offs from the tracker's **Explain** step
6. A quick revision list

Tip: read the note, type the code yourself in a small Spring Boot project (start.spring.io), then tick the box in the tracker.

## Day 1 – Creational patterns

- [Singleton](singleton.md)
- [Factory](factory.md)
- [Builder](builder.md)

## Day 2 – Behavioural and structural

- [Strategy](strategy.md)
- [Observer](observer.md)
- [Proxy](proxy.md)

## Day 3 – Wiring and data access

- [Dependency Injection](di.md)
- [Repository](repository.md)

## Day 4 – Resilience basics

- [Retry](retry.md)
- [Timeout](timeout.md)
- [Circuit Breaker](circuit.md)

## Day 5 – Safe APIs and read/write split

- [Idempotency](idempotency.md)
- [API Gateway](gateway.md)
- [CQRS](cqrs.md)

## Day 6 – Distributed transactions

- [Saga](saga.md)
- [Transactional Outbox](outbox.md)

## Day 7 – Priority 1 revision

- Revision day – re-read the notes above and explain each topic out loud.

## Day 8 – Protecting services

- [Rate Limiter](ratelimit.md)
- [Bulkhead](bulkhead.md)
- [Service Discovery](discovery.md)

## Day 9 – Data and messaging

- [Eventual Consistency](eventual.md)
- [Dead Letter Queue](dlq.md)
- [Sharding](sharding.md)

## Day 10 – Coordination

- [Two-Phase Commit](twopc.md)
- [TCC (Try-Confirm-Cancel)](tcc.md)
- [Leader Election](leader.md)

## Day 11 – Event sourcing and revision

- [Event Sourcing](eventsourcing.md)

## Day 12 – Migration patterns

- [Strangler Fig](strangler.md)
- [Anti-Corruption Layer](acl.md)
- [Sidecar](sidecar.md)

## Day 13 – Release and blast radius

- [Blue-Green Deployment](bluegreen.md)
- [Canary Release](canary.md)
- [Cell-Based Architecture](cell.md)

## Day 14 – Final revision

- Revision day – re-read the notes above and explain each topic out loud.

## Common Spring Boot dependencies used in these notes

| Need | Dependency |
|---|---|
| REST APIs | `spring-boot-starter-web` |
| Database (JPA) | `spring-boot-starter-data-jpa` + `h2` (for practice) |
| Lombok (`@Builder`, `@RequiredArgsConstructor`, `@Getter`) | `lombok` |
| Retry, Circuit Breaker, Bulkhead, Rate Limiter, TimeLimiter | `resilience4j-spring-boot3` + `spring-boot-starter-aop` |
| Spring Retry (`@Retryable`) | `spring-retry` + `spring-boot-starter-aop` |
| Caching (`@Cacheable`) | `spring-boot-starter-cache` |
| Kafka | `spring-kafka` |
| API Gateway | `spring-cloud-starter-gateway` |
| Service discovery | `spring-cloud-starter-netflix-eureka-server` / `-client` |
| Metrics & health | `spring-boot-starter-actuator` + `micrometer-registry-prometheus` |
