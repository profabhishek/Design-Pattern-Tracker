# Blue-Green Deployment

**In one line:** Keep **two identical environments** – Blue (live now) and Green (new version). Deploy to Green, test it, then **switch all traffic** from Blue to Green in one step. If something breaks, switch back.

---

## 1. Real-life example

A **stage show with two stages**. While the audience watches Stage Blue, the crew sets up the next act on Stage Green. When it's ready, the lights move to Green. If Green has a problem, lights go back to Blue instantly.

## 2. What problem does it solve?

Normal deploy: stop old version → start new version → downtime, and if the new version is broken, rollback is slow (redeploy old).

Blue-Green gives:
- **Zero downtime** (switch is instant).
- **Instant rollback** (switch back to Blue, still running).
- Test the new version **in the real production environment** before users hit it.

## 3. Picture

```diagram
caption: Blue-Green at a glance
fan: [Users → Load balancer / Router | one switch decides which colour is live]{accent} ; (100% of traffic now) [BLUE · v1 | live now]{good} ; (after the switch) [GREEN · v2 | deployed and tested, waiting]{muted} ; base: [Same database | shared by both versions]{db}
note: To release, flip the router to GREEN. To roll back, flip it back to BLUE — it is still running.
```

## 4. Build task – cutover and rollback steps (with DB migrations)

### Before

1. Blue runs **v1** and serves 100% traffic.
2. Database migration for v2 must be **backward compatible** (see below). Run it first.

### Deploy & test

3. Deploy **v2** to Green.
4. Run smoke tests against Green's internal URL (`/actuator/health`, key APIs).

### Cutover

5. Switch the router: traffic → Green.
6. Watch dashboards: error rate, latency, business metrics (orders/min) for 15–30 minutes.

### Rollback (if bad)

7. Switch router back → Blue. Done in seconds. Because DB changes were backward compatible, v1 still works.

### Clean up

8. When v2 is stable, Blue becomes the "next Green" for the next release.

### Kubernetes example (switch by changing a label)

```yaml
# two deployments: order-blue (v1) and order-green (v2), labels color=blue / color=green
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order
    color: blue          # ← change to "green" to switch, back to "blue" to roll back
  ports:
    - port: 80
      targetPort: 8080
```

```bash
kubectl patch service order-service -p '{"spec":{"selector":{"app":"order","color":"green"}}}'
```

### Spring Boot readiness

Make sure Green is truly ready before the switch:

```properties
management.endpoint.health.probes.enabled=true
management.endpoints.web.exposure.include=health,info
server.shutdown=graceful                       # finish in-flight requests on Blue
spring.lifecycle.timeout-per-shutdown-phase=30s
```

Health check URLs: `/actuator/health/readiness` and `/actuator/health/liveness`.

## 5. DB migrations – the tricky part (expand & contract)

Both versions use the **same database** at the same time, so a change must work for v1 **and** v2.

Example: rename column `name` → `full_name`.

| Step | Release | DB change (Flyway) | Code |
|---|---|---|---|
| 1. Expand | v2 | `ALTER TABLE users ADD full_name` and copy data | Writes **both** columns, reads `full_name` |
| 2. Migrate | — | backfill old rows | — |
| 3. Contract | v3 (later) | `ALTER TABLE users DROP COLUMN name` | Uses only `full_name` |

```sql
-- V7__add_full_name.sql  (safe: v1 ignores the new column)
ALTER TABLE users ADD COLUMN full_name VARCHAR(200);
UPDATE users SET full_name = name WHERE full_name IS NULL;
```

**Never** drop/rename a column in the same release that stops using it – rollback to Blue would break.

## 6. Points to explain in an interview

- **DB migrations:** must be backward compatible (expand → contract).
- **Cost of double infrastructure:** you need 2× servers during the release (cloud makes this cheaper – create Green only during deploys).
- Long-running requests/sessions on Blue: use graceful shutdown, sticky sessions or external session store (Redis).
- Blue-Green switches **all users at once**; Canary moves **gradually**.

## 7. Quick revision

- Two environments, switch traffic in one step.
- Instant rollback by switching back.
- Backward-compatible DB changes; costs double infra.
