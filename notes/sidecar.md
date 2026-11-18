# Sidecar

**In one line:** Run a **helper process next to your app** (same machine / same Kubernetes pod) that handles common jobs like logging, proxying, security, so your app code doesn't have to.

---

## 1. Real-life example

A **motorcycle with a sidecar**. The bike (your app) does the main job – driving. The sidecar is attached, goes everywhere the bike goes, and carries extra stuff. It starts and stops with the bike.

## 2. What problem does it solve?

Every service needs the same "plumbing":
- collect and ship logs,
- TLS / mTLS between services,
- retries, metrics, tracing,
- config reload, secrets fetching.

If you write this in each app, in each language (Java, Go, Node), it's duplicated and inconsistent. A sidecar does it **once**, **outside** the app, for any language.

## 3. Picture (Kubernetes pod)

```
┌───────────────────── Pod ─────────────────────┐
│  ┌──────────────┐      ┌───────────────────┐  │
│  │ Spring Boot  │ ───► │ Sidecar (Envoy /  │──┼──► other services
│  │ app :8080    │      │ Fluent Bit / etc) │  │
│  └──────────────┘      └───────────────────┘  │
│        shared network (localhost) + volumes   │
└───────────────────────────────────────────────┘
```

They share **localhost** and can share **files** (volumes).

## 4. Build task – a logging sidecar next to one service

### Spring Boot app writes logs to a file

```properties
logging.file.name=/var/log/app/app.log
logging.structured.format.file=ecs           # Spring Boot 3.4+: JSON logs
```

```java
@RestController
@Slf4j
public class HelloController {
    @GetMapping("/hello")
    public String hello() {
        log.info("Hello endpoint called");
        return "Hello";
    }
}
```

The app knows **nothing** about Elasticsearch/Loki. It just writes a file.

### Kubernetes pod with a Fluent Bit sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  volumes:
    - name: logs
      emptyDir: {}                       # shared folder between containers
  containers:
    - name: app
      image: myrepo/order-service:1.0
      ports: [{ containerPort: 8080 }]
      volumeMounts:
        - { name: logs, mountPath: /var/log/app }

    - name: log-shipper                  # ← the sidecar
      image: fluent/fluent-bit:3.0
      volumeMounts:
        - { name: logs, mountPath: /var/log/app, readOnly: true }
      # its config reads /var/log/app/*.log and sends to Loki/Elasticsearch
```

Kubernetes 1.29+ also supports "native sidecars" (an init container with `restartPolicy: Always`) so the sidecar starts before and stops after the app.

### Proxy sidecar example

With a **service mesh** (Istio/Linkerd), an Envoy sidecar is injected automatically. Your app calls `http://payment-service:8080` in plain HTTP; the sidecar adds **mTLS, retries, timeouts, metrics** on the way out. Many retry/timeout settings can then move from Resilience4j to mesh config.

## 5. Sidecar vs Library

| Sidecar | Library (e.g. Resilience4j, Micrometer inside the app) |
|---|---|
| Works for **any language** | Must exist for your language |
| Update without changing/redeploying app code | Need to rebuild every app to upgrade |
| Extra **process** → more CPU/memory per pod | No extra process |
| Extra **network hop** on localhost → small latency | In-process, fastest |
| Less app-level context | Knows business context (e.g. which method failed) |

## 6. Trade-offs to explain

- **Latency overhead:** each call goes app → sidecar → network (usually ~1 ms, but adds up).
- **Lifecycle coupling:** sidecar must start before the app and stop after it; if the sidecar crashes, the app may lose network/logs.
- **Resource cost:** one extra container per pod × hundreds of pods.
- **Debugging** gets harder (is it the app or the sidecar?).

## 7. Quick revision

- Helper container next to the app, same lifecycle, shares localhost/volumes.
- Used for logs, proxies (service mesh), config, secrets.
- Sidecar vs library: language-free and independent vs faster and simpler.
