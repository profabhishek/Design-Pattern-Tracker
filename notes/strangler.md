# Strangler Fig

**In one line:** Replace an old (legacy) system **slowly, one feature/route at a time**, by putting a routing layer in front and sending more and more traffic to the new system until the old one can be switched off.

---

## 1. Real-life example

A **strangler fig tree** grows around an old tree. Slowly it covers it completely, and finally the old tree dies and only the new one stands. Or: renovating your house **one room at a time** while still living in it, instead of breaking the whole house.

## 2. What problem does it solve?

A "big bang rewrite" (stop everything, rewrite the whole app, switch in one day) is very risky:
- takes years, business can't wait,
- the new app misses hidden features of the old one,
- switching day fails → huge outage.

Strangler Fig gives **small, safe, reversible** steps.

## 3. Steps

1. Put a **routing layer** (API gateway / proxy) in front of the old system. At first it sends **100%** to legacy.
2. Pick **one** small endpoint, e.g. `GET /products/{id}`. Build it in the new service.
3. Route that endpoint to the new service (maybe 5% first, then 100%).
4. Repeat for the next endpoint.
5. When nothing goes to legacy any more → **turn it off**. 🎉

```
          ┌──────────────── Routing layer ────────────────┐
 Client ─►│ /products/** → NEW product-service            │
          │ /orders/**   → LEGACY monolith (for now)      │
          │ everything else → LEGACY monolith             │
          └───────────────────────────────────────────────┘
```

## 4. Build task – move one legacy endpoint behind a routing layer

### Spring Cloud Gateway as the routing layer

```yaml
spring:
  cloud:
    gateway:
      routes:
        # 1. migrated route → new service (more specific, listed first)
        - id: products-new
          uri: http://product-service:8080
          predicates:
            - Path=/products/**
            - Method=GET

        # 2. catch-all → legacy
        - id: legacy
          uri: http://legacy-monolith:9090
          predicates:
            - Path=/**
```

### Gradual cut-over with weights

```yaml
        - id: products-new
          uri: http://product-service:8080
          predicates:
            - Path=/products/**
            - Weight=products, 10        # 10% to new
        - id: products-old
          uri: http://legacy-monolith:9090
          predicates:
            - Path=/products/**
            - Weight=products, 90        # 90% to legacy
```

Rollback = change 10 back to 0. No deploy of the services needed.

### Feature-flag routing in a Spring app (alternative)

```java
@RestController
@RequiredArgsConstructor
public class ProductFacade {
    private final NewProductService newService;
    private final LegacyProductClient legacy;

    @Value("${migration.products.use-new:false}")
    private boolean useNew;

    @GetMapping("/products/{id}")
    public ProductDto get(@PathVariable Long id) {
        return useNew ? newService.get(id) : legacy.get(id);
    }
}
```

## 5. Data sync

The hardest part. Both systems may need the same data during migration.

- **Phase 1:** new service **reads** legacy DB (or a replica) – quick start.
- **Phase 2:** new service has its own DB, kept in sync using **CDC** (Debezium) or events from legacy.
- **Phase 3:** new service becomes the **owner**; legacy reads from it (or via an Anti-Corruption Layer).
- Avoid both systems **writing** the same data at the same time (conflicts).

**Shadow testing / parallel run:** send the same request to both, return legacy's answer, compare responses in logs. When they match for weeks → switch.

## 6. When to cut over?

- New endpoint has the same results (compare/shadow test) ✅
- Error rate and latency are fine on 5% → 25% → 100% traffic ✅
- Rollback plan tested ✅
- Then remove the legacy code for that endpoint, so you don't keep two versions forever.

## 7. Points to explain in an interview

- **Routing layer:** gateway/proxy decides old vs new per route; keeps clients unchanged.
- **Data sync:** CDC/events, single owner per data, shadow reads.
- **When to cut over:** metrics + comparison + tested rollback.
- Risk: migration "never finishes" → set clear milestones and delete old paths.

## 8. Quick revision

- Replace legacy piece by piece behind a router.
- Start with 100% legacy, move routes one by one.
- Handle data sync carefully; switch off legacy at the end.
