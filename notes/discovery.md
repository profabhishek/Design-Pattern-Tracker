# Service Discovery

**In one line:** Services keep starting, stopping and moving. Service discovery is a **phone book** that tells you the **current address** of a service by its name.

---

## 1. Real-life example

You want to call a pizza shop. You don't remember the number – you search the name on **Google/JustDial** and get today's number. If the shop changes its number, the directory is updated.

## 2. What problem does it solve?

In the cloud/Kubernetes:
- A service may have 5 instances today, 12 tomorrow (auto-scaling).
- IPs change every time an instance restarts.
- Hard-coding `http://10.0.3.17:8081` breaks immediately.

So: services **register** themselves in a **registry**, and others **look up** by name (`order-service`).

## 3. Main pieces

1. **Service Registry** – the phone book (Eureka, Consul, Zookeeper, Kubernetes DNS/etcd).
2. **Registration** – on startup, an instance says "I'm `order-service` at 10.0.3.17:8081".
3. **Health checks / heartbeats** – instance keeps saying "I'm alive". Silent ones get removed.
4. **Lookup** – callers ask for healthy instances and pick one (load balancing).

## 4. Client-side vs Server-side discovery (build task – draw the flow)

### Client-side discovery

```diagram
caption: Client-side discovery
flow: [order-service | the caller]{accent} -> (1. where is payment-service?) [Registry (Eureka) | phone book of live instances]{muted}
flow: [order-service]{accent} <- (2. here: 10.0.1.5, 10.0.1.6) [Registry (Eureka)]{muted}
flow: [order-service | 3. picks one itself (client-side load balancing)]{accent} -> (calls directly) [payment-service | 10.0.1.6]{good}
```

### Server-side discovery

```diagram
caption: Server-side discovery
flow: [order-service | just calls one name]{accent} -> [Load balancer / Router | K8s Service · AWS ALB | looks up the registry itself]{warn} -> (forwards) [payment-service | one healthy instance]{good}
```

| | Client-side | Server-side |
|---|---|---|
| Who chooses the instance | The calling service | A load balancer/router |
| Example | Eureka + Spring Cloud LoadBalancer | Kubernetes Service, AWS ALB |
| Pros | No extra hop, smart client-side balancing | Clients stay simple, any language works |
| Cons | Each client needs the discovery library | Extra hop; LB must be highly available |

## 5. Spring Boot code – Eureka (client-side)

### Registry server

Dependency: `spring-cloud-starter-netflix-eureka-server`

```java
@SpringBootApplication
@EnableEurekaServer
public class RegistryApplication {
    public static void main(String[] args) { SpringApplication.run(RegistryApplication.class, args); }
}
```

```yaml
server.port: 8761
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

### A service registers itself

Dependency: `spring-cloud-starter-netflix-eureka-client`

```yaml
spring.application.name: payment-service
server.port: 0                         # random port – discovery makes it OK
eureka:
  client.service-url.defaultZone: http://localhost:8761/eureka
  instance:
    lease-renewal-interval-in-seconds: 10     # heartbeat every 10s
```

### Calling by name

```java
@Configuration
public class ClientConfig {
    @Bean
    @LoadBalanced                       // resolves "payment-service" via the registry
    public RestClient.Builder lbRestClientBuilder() {
        return RestClient.builder();
    }
}

@Service
public class PaymentCaller {
    private final RestClient client;

    public PaymentCaller(RestClient.Builder builder) {
        this.client = builder.baseUrl("http://payment-service").build();   // name, not IP!
    }

    public String pay(Long orderId) {
        return client.post().uri("/pay/{id}", orderId).retrieve().body(String.class);
    }
}
```

Or with OpenFeign:

```java
@FeignClient(name = "payment-service")
public interface PaymentFeign {
    @PostMapping("/pay/{id}") String pay(@PathVariable Long id);
}
```

### In Kubernetes (server-side)

No Eureka needed – K8s gives each Service a DNS name:

```properties
payment.base-url=http://payment-service.default.svc.cluster.local:8080
```

## 6. Health checks

- Spring Boot Actuator gives `/actuator/health`. The registry/K8s uses it.
- K8s: **liveness** probe (restart if dead) and **readiness** probe (don't send traffic until ready).
- Remove unhealthy instances fast, or callers get errors. Use retries + timeouts as a safety net.

## 7. Quick revision

- Registry = phone book of live instances.
- Client-side (Eureka) vs server-side (K8s Service / LB).
- Heartbeats + health checks keep the list fresh.
