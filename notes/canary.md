# Canary Release

**In one line:** Release the new version to a **small % of users first** (say 5%). Watch the metrics. If it's healthy, increase to 25%, 50%, 100%. If not, roll back – only a few users were affected.

---

## 1. Real-life example

Old coal miners took a **canary bird** into the mine. If there was poison gas, the canary got sick first and the miners escaped in time. The 5% users are your "canary" – they show problems before everyone is hit.

## 2. What problem does it solve?

Some bugs only appear with **real traffic** (real data, real load). Releasing to 100% at once means a bug hits **everyone**. Canary limits the **blast radius**.

## 3. Build task – metrics and rollback thresholds for 5% → 25% → 100%

| Stage | Traffic to v2 | Wait | Move forward only if… |
|---|---|---|---|
| 1 | **5%** | 15–30 min | error rate ≤ v1 + 0.5%, p99 latency ≤ v1 × 1.2, no new 5xx types, no crash loops |
| 2 | **25%** | 30–60 min | same checks + business metrics OK (orders/min, payment success rate) |
| 3 | **100%** | — | keep old version ready for a few hours for quick rollback |

**Automatic rollback** if at any stage:
- HTTP 5xx rate > 1% (or 2× v1)
- p99 latency > 800 ms
- payment success rate drops by > 2%
- pods restarting

Always **compare canary vs baseline (v1) at the same time**, not against yesterday.

## 4. Spring Boot side – expose good metrics

Dependencies: `spring-boot-starter-actuator`, `micrometer-registry-prometheus`.

```properties
management.endpoints.web.exposure.include=health,prometheus
management.metrics.tags.version=${APP_VERSION:unknown}   # tag every metric with version
management.metrics.distribution.percentiles-histogram.http.server.requests=true
```

Now Prometheus can compare `http_server_requests_seconds` and error counts **by version**.

Custom business metric:

```java
@Service
@RequiredArgsConstructor
public class PaymentService {
    private final MeterRegistry registry;

    public void pay(Order o) {
        try {
            // ... charge
            registry.counter("payments", "result", "success").increment();
        } catch (Exception e) {
            registry.counter("payments", "result", "failure").increment();
            throw e;
        }
    }
}
```

## 5. Routing traffic

### Spring Cloud Gateway weights

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: orders-v2-canary
          uri: http://order-v2:8080
          predicates: [ "Path=/orders/**", "Weight=orders, 5" ]
        - id: orders-v1
          uri: http://order-v1:8080
          predicates: [ "Path=/orders/**", "Weight=orders, 95" ]
```

### Kubernetes with Argo Rollouts (automatic steps + rollback)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: order-service }
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 20m }
        - analysis: { templates: [ { templateName: error-rate-check } ] }
        - setWeight: 25
        - pause: { duration: 45m }
        - analysis: { templates: [ { templateName: error-rate-check } ] }
        - setWeight: 100
```

The `AnalysisTemplate` queries Prometheus (e.g. 5xx rate < 1%) and aborts → rolls back automatically if it fails.

### Canary for chosen users (feature flag style)

```java
@Component
public class CanaryRouter {
    @Value("${canary.percent:5}") int percent;

    public boolean isCanaryUser(String userId) {
        return Math.floorMod(userId.hashCode(), 100) < percent;   // same user → same group always
    }
}
```

## 6. Sticky users

If a user hits v2 on one request and v1 on the next, they may see a weird mix (new button disappears). So route by **user id / cookie hash** (as above), not randomly per request. Also, **v1 and v2 must work with the same database and the same API contracts** (backward compatible), because both run at once.

## 7. Canary vs Blue-Green

| Canary | Blue-Green |
|---|---|
| Gradual: 5% → 25% → 100% | All at once |
| Small blast radius | Everyone affected if bad (but instant switch back) |
| Needs good metrics + traffic splitting | Simpler routing, needs 2× infra |

## 8. Quick revision

- Small % first, watch metrics, then increase.
- Define thresholds and automatic rollback up front.
- Sticky users; both versions must be compatible.
