# Cell-Based Architecture

**In one line:** Split your whole system into many **independent, full copies** ("cells"). Each cell serves only some customers (by tenant or region). If one cell fails, **only its customers** are affected.

---

## 1. Real-life example

A **big hospital chain** with many branches. Each branch has its own doctors, labs and pharmacy. If one branch has a power cut, patients of the other branches are fine. A front desk (call center) tells each patient which branch is theirs.

## 2. What problem does it solve?

In a normal setup, all customers share one big set of services and one database. A bad deploy, a poison message, a noisy customer or a DB overload can take down **everyone**.

Cells reduce the **blast radius**:
- 10 cells → one failure hits ~10% of customers, not 100%.
- Deploy new versions **cell by cell** (like canary at the infrastructure level).
- A noisy big customer can be moved to its own cell.

Used by AWS, Slack, DoorDash, Salesforce, etc.

## 3. Build task – draw cells, the router and blast radius

```
                   ┌──────────────────────────────┐
  Users ─────────► │  Cell Router (thin, global)  │  tenant → cell lookup
                   └──────┬─────────┬─────────┬───┘
                          ▼         ▼         ▼
                   ┌─────────┐ ┌─────────┐ ┌─────────┐
                   │ CELL 1  │ │ CELL 2  │ │ CELL 3  │
                   │ API     │ │ API     │ │ API     │
                   │ Orders  │ │ Orders  │ │ Orders  │
                   │ Payment │ │ Payment │ │ Payment │
                   │ DB,Queue│ │ DB,Queue│ │ DB,Queue│
                   └─────────┘ └────💥───┘ └─────────┘
                    tenants      tenants     tenants
                    A, B, C      D, E, F     G, H, I

  Cell 2 fails → only D, E, F are affected (blast radius = 1/3).
```

Rules:
- A cell has **everything** it needs (services + DB + cache + queues).
- Cells **don't call each other** in the normal request path.
- The **router** is the only shared part, so it must be **very simple and very reliable**.

## 4. Spring Boot code – a simple cell router

### Mapping tenant → cell

```java
@Entity
@Table(name = "tenant_cell")
@Getter @Setter
public class TenantCell {
    @Id private String tenantId;
    private String cellId;              // "cell-1"
}

@Service
@RequiredArgsConstructor
public class CellDirectory {
    private final TenantCellRepository repo;
    private final Map<String, String> cellUrls = Map.of(
            "cell-1", "http://cell-1.internal",
            "cell-2", "http://cell-2.internal",
            "cell-3", "http://cell-3.internal");

    @Cacheable("tenantCell")                       // router reads are cached – must be fast
    public String urlFor(String tenantId) {
        String cell = repo.findById(tenantId)
                .map(TenantCell::getCellId)
                .orElseGet(() -> "cell-" + (Math.floorMod(tenantId.hashCode(), 3) + 1)); // default placement
        return cellUrls.get(cell);
    }
}
```

### Gateway filter that sends the request to the right cell

```java
@Component
@RequiredArgsConstructor
public class CellRoutingFilter implements GlobalFilter, Ordered {
    private final CellDirectory directory;

    @Override
    public Mono<Void> filter(ServerWebExchange ex, GatewayFilterChain chain) {
        String tenant = ex.getRequest().getHeaders().getFirst("X-Tenant-Id");
        if (tenant == null) {
            ex.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return ex.getResponse().setComplete();
        }
        // a blocking lookup on a reactive thread is NOT ok in production:
        // keep the map in memory (refreshed periodically) or use a reactive repository
        URI cellUri = URI.create(directory.urlFor(tenant));
        URI target = UriComponentsBuilder.fromUri(ex.getRequest().getURI())
                .scheme(cellUri.getScheme()).host(cellUri.getHost()).port(cellUri.getPort())
                .build(true).toUri();
        ex.getAttributes().put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, target);
        return chain.filter(ex);
    }

    @Override
    public int getOrder() { return RouteToRequestUrlFilter.ROUTE_TO_URL_FILTER_ORDER + 1; }
}
```

(Simpler options: DNS per tenant like `tenant-a.app.com → cell-1`, or a route per cell in the load balancer.)

Each cell runs the **same** Spring Boot services with its own config:

```properties
# cell-2 application.properties
cell.id=cell-2
spring.datasource.url=jdbc:postgresql://db.cell-2.internal/app
spring.kafka.bootstrap-servers=kafka.cell-2.internal:9092
```

## 5. Points to explain in an interview

- **Blast radius:** failure/bad deploy limited to one cell. Deploy cell by cell.
- **Cell routing:** router must be thin, cached, highly available; mapping stored in a highly-available store. If the router fails, everything fails – so keep it dumb.
- **Rebalancing:** moving a tenant from cell 2 to cell 4 = copy data, short write freeze or dual-write, flip the mapping, clean up. Needs tooling.
- **Cell size:** fixed max size (e.g. 1000 tenants); when full, add a new cell instead of growing it → predictable, tested capacity.
- **Cost/complexity:** many copies of everything; global features (e.g. "search across all tenants", global reports) need a separate aggregated system.
- Cells vs shards: sharding splits **one database**; cells split the **whole stack**.

## 6. Quick revision

- Many full independent copies of the stack; customers pinned to a cell.
- Thin router maps tenant → cell.
- Small blast radius; harder rebalancing and global features.
