# TRACK spring
title: Spring Boot, REST & JPA
icon: 🌱
color: #22c55e
tier: must
about: IoC, beans, auto-configuration, the request lifecycle, REST design, security, @Transactional, JPA and testing. Your day job, interview-ready.

## MODULE spring-core | Spring core & Boot internals

### ITEM sp-ioc | What problem does Spring solve? IoC and Dependency Injection | must
ask: What problem does Spring solve? Explain IoC and Dependency Injection.
card: Without Spring, classes create their own dependencies (new PaymentClient()), which makes them tightly coupled and hard to test. Inversion of Control: the container creates objects (beans) and wires them together. Dependency Injection is how: dependencies are passed in (constructor, setter, field). Result: loose coupling, easy mocking, central config, and plug-in features (transactions, security, caching) through proxies.
patterns: di

> 🧒 **Like you're 5:** Instead of every kid bringing their own lunch from home (new everything), the school canteen (Spring) prepares all lunches and hands each kid exactly what they need. Kids just say "I need a sandwich".

```java
// ❌ tight coupling
class OrderService { private final PaymentClient client = new RazorpayClient(); }

// ✅ DI: Spring passes the dependency in
@Service
class OrderService {
    private final PaymentClient client;
    OrderService(PaymentClient client) { this.client = client; }   // any implementation, or a mock in tests
}
```

> 🎯 **Say this in the interview:** "IoC means the framework controls object creation and lifecycle, not my code. DI is the technique. It gives me testability and lets Spring wrap beans in proxies for @Transactional, @Cacheable and security."

### ITEM sp-context | BeanFactory vs ApplicationContext; bean lifecycle and callbacks | must
ask: BeanFactory vs ApplicationContext; bean lifecycle and lifecycle callbacks.
card: BeanFactory = basic container, lazy creation. ApplicationContext = BeanFactory + events, i18n, AOP integration, eager singleton creation, environment/profiles: what you always use. Lifecycle: instantiate → inject dependencies → Aware callbacks → BeanPostProcessor before-init → @PostConstruct / afterPropertiesSet / init-method → BeanPostProcessor after-init (proxies are created here) → ready → @PreDestroy / destroy on shutdown.

> 🧒 **Like you're 5:** A bean's life: born (constructor), gets its toys (dependencies), gets dressed up (post-processors may wrap it in a costume = proxy), says hello (@PostConstruct), works all day, says goodbye (@PreDestroy).

```diagram
new Bean() → inject deps → *Aware → BPP.before → @PostConstruct → BPP.after (proxy!) → in use → @PreDestroy
```

```java
@Component
class CacheWarmer {
    @PostConstruct void load() { /* runs once after injection */ }
    @PreDestroy void flush() { /* runs on graceful shutdown */ }
}
```

> ⚠️ **Trap:** Don't call other beans' proxied methods (like @Transactional ones) from a constructor: the proxy and the context aren't fully ready. Use @PostConstruct or an `ApplicationReadyEvent` listener.

### ITEM sp-stereotypes | @Component vs @Service vs @Repository vs @Controller | must
ask: @Component vs @Service vs @Repository vs @Controller.
card: All are @Component specialisations, picked up by component scanning. @Service = business logic (semantic only). @Repository = data access + translates DB exceptions into Spring's DataAccessException hierarchy. @Controller = MVC web controller returning views; @RestController = @Controller + @ResponseBody (returns JSON).

> 🧒 **Like you're 5:** They're all "school staff" (@Component), but the badge tells you the job: teacher (@Service), librarian (@Repository), receptionist (@Controller).

| Annotation | Layer | Extra behaviour |
|---|---|---|
| `@Component` | Generic | None |
| `@Service` | Business | None (clarity, AOP pointcuts) |
| `@Repository` | Data | Exception translation |
| `@Controller` / `@RestController` | Web | Request mapping; JSON with @RestController |

### ITEM sp-bean-config | @Bean vs @Component; @Configuration and proxyBeanMethods | must
ask: @Bean vs @Component; @Configuration and proxyBeanMethods.
card: @Component goes on YOUR class (auto-detected by scanning). @Bean goes on a method in a @Configuration class that returns an object: use it for third-party classes you can't annotate (RestTemplate, ObjectMapper, DataSource) or when creation needs logic. @Configuration classes are CGLIB-proxied (proxyBeanMethods = true) so calling one @Bean method from another returns the same singleton; proxyBeanMethods = false is faster but each call creates a new object.

> 🧒 **Like you're 5:** @Component is a kid who raises their hand: "I'm a bean!". @Bean is a teacher who builds a bean from parts (even parts bought from another shop) and hands it over.

```java
@Configuration
class HttpConfig {
    @Bean
    RestClient paymentClient(RestClient.Builder b) {
        return b.baseUrl("https://pay.example.com").build();
    }
}
```

### ITEM sp-injection | Constructor vs setter vs field injection | must
ask: Constructor vs setter vs field injection; why is constructor injection preferred?
card: Constructor injection: dependencies are final, the object is always fully built, missing beans fail at startup, easy to test with plain new + mocks, and circular dependencies show up immediately. Setter injection: for optional dependencies. Field injection (@Autowired on fields): hidden dependencies, can't be final, needs reflection to test: avoid. With one constructor, @Autowired is optional.

> 🧒 **Like you're 5:** Constructor injection is getting your school bag packed before you leave home: you can't forget anything. Field injection is someone sneaking books into your bag after you're already in class.

```java
@Service
@RequiredArgsConstructor               // Lombok writes the constructor
class InvoiceService {
    private final InvoiceRepository repo;
    private final Clock clock;         // injectable clock = testable time!
}
```

### ITEM sp-scopes | Singleton, prototype, request and session scopes | must
ask: Explain bean scopes: singleton, prototype, request, session.
card: singleton (default) = one instance per ApplicationContext, shared by all threads: must be stateless or thread-safe. prototype = a new instance every time it's requested (Spring doesn't destroy it). request = one per HTTP request. session = one per HTTP session. Injecting a prototype/request bean into a singleton needs a scoped proxy or ObjectProvider, otherwise you get the same instance forever.

> 🧒 **Like you're 5:** Singleton is the one school bus everyone shares. Prototype is a paper cup: everyone gets a new one. Request scope is a visitor badge for one visit only.

> ⚠️ **Trap:** Putting state (like `private List<Order> current`) in a singleton @Service is a classic concurrency bug: all requests share it.

```java
@Service
class ReportService {
    private final ObjectProvider<ReportBuilder> builders;   // prototype
    Report run() { return builders.getObject().build(); }   // fresh builder each call
}
```

### ITEM sp-qualifier | @Primary vs @Qualifier; @Lazy; circular dependencies | must
ask: @Primary vs @Qualifier; @Lazy; circular dependency resolution.
card: Two beans of the same type → NoUniqueBeanDefinitionException. @Primary marks the default one. @Qualifier("name") picks a specific one at the injection point (wins over @Primary). @Lazy creates the bean (or a lazy proxy) only when first used. Circular dependency (A needs B, B needs A): Spring Boot 2.6+ fails by default; fix the design (extract a third service, use events), or as a last resort @Lazy on one side.

> 🧒 **Like you're 5:** Two kids called Rahul in class. @Primary = "if you just say Rahul, I mean Rahul K". @Qualifier = "I specifically want Rahul S".

```java
@Bean @Primary PaymentClient razorpay() { ... }
@Bean PaymentClient stripe() { ... }

OrderService(@Qualifier("stripe") PaymentClient client) { ... }
```

> 🎯 **Say this in the interview:** "A circular dependency usually means two services do too much. I'd move the shared logic into a third bean or decouple with an application event rather than hide it with @Lazy."

### ITEM sp-autoconfig | How Spring Boot auto-configuration works; @Conditional | must
ask: How does Spring Boot auto-configuration work? @Conditional annotations.
card: @SpringBootApplication = @Configuration + @ComponentScan + @EnableAutoConfiguration. Boot reads the list of auto-config classes from META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports (spring.factories before 2.7). Each is guarded by conditions: @ConditionalOnClass (library on classpath?), @ConditionalOnMissingBean (you didn't define your own?), @ConditionalOnProperty. So adding a starter + properties gives you working beans, and your own bean always wins. Debug with --debug (condition evaluation report) or /actuator/conditions.

> 🧒 **Like you're 5:** Spring Boot is a smart parent packing your bag: "Is there a football in the house? Pack football boots. Did the kid already pack their own boots? Then don't pack mine."

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
class DataSourceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean            // backs off if you define your own DataSource
    DataSource dataSource(DataSourceProperties p) { ... }
}
```

### ITEM sp-startup | Starters, embedded server, application startup lifecycle | good
ask: What are Spring Boot starters? How does the embedded server and startup work?
card: Starters are dependency bundles with compatible versions (spring-boot-starter-web = Spring MVC + Jackson + embedded Tomcat + validation). The app is a fat jar with an embedded server (Tomcat default; Jetty/Undertow possible), started from main(). Startup: SpringApplication.run → create Environment (properties, profiles) → create ApplicationContext → load bean definitions + auto-config → instantiate singletons → start web server → run CommandLineRunner/ApplicationRunner → ApplicationReadyEvent.

> 🧒 **Like you're 5:** A starter is a meal combo: one order gets you the burger, fries and drink that go well together. The embedded server means the restaurant comes inside your lunch box.

> 💡 **Tip:** Run code after startup with `ApplicationRunner` or `@EventListener(ApplicationReadyEvent.class)`. Use `server.shutdown=graceful` so in-flight requests finish on deploys.

### ITEM sp-profiles | Profiles and externalized configuration | must
ask: How do profiles and externalized configuration work?
card: Config comes from many sources with a precedence order: command-line args > env variables > application-{profile}.yml > application.yml > defaults. Profiles (spring.profiles.active=prod) switch config and beans (@Profile("dev")). Bind groups of properties type-safely with @ConfigurationProperties (records work). Keep secrets out of the repo: env vars, Vault, AWS Secrets Manager.

> 🧒 **Like you're 5:** The same game with different difficulty settings: "dev mode" has cheat codes and a fake bank, "prod mode" uses the real bank. You choose the mode when you start the game.

```yaml
# application.yml
payment:
  base-url: https://sandbox.pay.com
  timeout: 2s
---
spring.config.activate.on-profile: prod
payment:
  base-url: https://pay.com
```

```java
@ConfigurationProperties("payment")
record PaymentProps(URI baseUrl, Duration timeout) {}
```

## MODULE spring-web | Spring MVC, REST & security

### ITEM sp-dispatcher | Request flow from DispatcherServlet to controller and back | must
ask: Explain the request flow from DispatcherServlet to controller and response.
card: Request → servlet container (Tomcat thread) → Filter chain (incl. Spring Security) → DispatcherServlet → HandlerMapping finds the controller method → HandlerInterceptor.preHandle → HandlerAdapter resolves arguments (@PathVariable, @RequestBody via HttpMessageConverter/Jackson, validation) → controller → service → repository → return value converted to JSON by HttpMessageConverter → postHandle/afterCompletion → response. Exceptions go to @ControllerAdvice handlers.

> 🧒 **Like you're 5:** A letter arrives at a big office. Security guards check it (filters), the receptionist (DispatcherServlet) reads the address and sends it to the right desk (controller). The worker replies, the reply is put in an envelope (JSON) and sent back.

```diagram
HTTP → Tomcat thread → Filters (security, CORS, logging)
     → DispatcherServlet → HandlerMapping → Interceptor.preHandle
     → argument resolvers + Jackson + @Valid → @RestController method
     → return object → Jackson → JSON → Interceptor.afterCompletion → HTTP response
```

### ITEM sp-filter-aop | Filter vs HandlerInterceptor vs AOP | must
ask: Filter vs HandlerInterceptor vs AOP; execution order and use cases.
card: Filter = Servlet level, runs first, sees every request (even non-Spring ones): security, CORS, request logging, correlation IDs, compression. HandlerInterceptor = Spring MVC level, knows which controller method will run: auth checks per handler, timing, locale. AOP (@Aspect) = around any Spring bean method, not only web: logging, metrics, @Transactional, @Cacheable, retries. Order: Filter → DispatcherServlet → Interceptor → (AOP proxy) → controller.

> 🧒 **Like you're 5:** Filter = the school gate guard (checks everyone). Interceptor = the classroom door monitor (knows which class you're going to). AOP = an invisible helper who follows a specific teacher around in every room, taking notes.

| | Filter | Interceptor | AOP |
|---|---|---|---|
| Level | Servlet | Spring MVC | Any Spring bean |
| Knows the handler? | ❌ | ✅ | ✅ (method + args) |
| Typical use | Auth tokens, CORS, MDC trace id | Per-endpoint checks, timing | Logging, metrics, transactions |

### ITEM sp-annotations | @Controller vs @RestController; @RequestParam vs @PathVariable vs @RequestBody | must
ask: @Controller vs @RestController; @RequestParam vs @PathVariable vs @RequestBody.
card: @RestController = @Controller + @ResponseBody, so return values become JSON. @PathVariable = part of the URL path that identifies a resource (/orders/{id}). @RequestParam = query string, for filters/options (?status=PAID&page=2). @RequestBody = JSON body deserialized into an object (POST/PUT). @RequestHeader for headers. Use ResponseEntity to control status and headers.

> 🧒 **Like you're 5:** Path variable is the house number (which house). Request param is a note "please, the blue door" (options). Request body is the parcel you deliver inside.

```java
@RestController
@RequestMapping("/api/v1/orders")
class OrderController {
    @GetMapping("/{id}")
    OrderDto get(@PathVariable long id) { ... }

    @GetMapping
    Page<OrderDto> list(@RequestParam(defaultValue = "PAID") String status, Pageable page) { ... }

    @PostMapping
    ResponseEntity<OrderDto> create(@Valid @RequestBody CreateOrderRequest req) {
        OrderDto o = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + o.id())).body(o);   // 201 + Location
    }
}
```

### ITEM sp-http-methods | POST vs PUT vs PATCH; idempotent and safe methods | must
ask: POST vs PUT vs PATCH; idempotency; safe and idempotent HTTP methods.
card: GET (read: safe + idempotent), POST (create/action: NOT idempotent), PUT (replace the whole resource at a known URI: idempotent), PATCH (partial update: not guaranteed idempotent), DELETE (idempotent: deleting twice leaves the same state). Safe = no state change. Idempotent = repeating the request has the same effect as doing it once: important for retries. Make POST safe to retry with an Idempotency-Key header.
patterns: idempotency

> 🧒 **Like you're 5:** Pressing the lift button 5 times still brings one lift (idempotent). Ordering a pizza 5 times gets you 5 pizzas (not idempotent).

| Method | Safe | Idempotent | Typical status |
|---|---|---|---|
| GET | ✅ | ✅ | 200 |
| POST | ❌ | ❌ | 201 Created |
| PUT | ❌ | ✅ | 200 / 204 |
| PATCH | ❌ | ❌ (usually) | 200 |
| DELETE | ❌ | ✅ | 204 |

### ITEM sp-api-design | Designing pagination, sorting, filtering and API versioning | must
ask: How do you design pagination, sorting, filtering and API versioning?
card: Pagination: offset/limit (page & size, simple, slow for deep pages) or cursor/keyset (?after=lastId, stable and fast). Return items + next cursor/total. Sorting: ?sort=createdAt,desc with a whitelist of fields. Filtering: query params (?status=PAID&from=...). Versioning: URI (/api/v1), header, or media type; URI is simplest. Never break existing clients: add fields, don't rename/remove; deprecate with a timeline.

> 🧒 **Like you're 5:** Pagination is reading a big book one page at a time instead of carrying all 1,000 pages. A cursor is a bookmark: "continue after this line".

```http
GET /api/v1/orders?status=PAID&sort=createdAt,desc&size=20&after=eyJpZCI6MTIzfQ
```

```java
@GetMapping
Page<OrderDto> list(@RequestParam(required = false) String status,
                    @PageableDefault(size = 20, sort = "createdAt", direction = DESC) Pageable p) { ... }
```

> ⚠️ **Trap:** Always cap the page size (e.g. max 100), or someone requests size=1,000,000.

### ITEM sp-exceptions | Global exception handling with @ControllerAdvice | must
ask: How do you implement global exception handling with @ControllerAdvice and @ExceptionHandler?
card: @RestControllerAdvice class with @ExceptionHandler methods that map exceptions to HTTP status + a consistent error body. Spring 6 has ProblemDetail (RFC 7807: type, title, status, detail). Map: not found → 404, validation (MethodArgumentNotValidException) → 400 with field errors, conflict → 409, unknown → 500 with a generic message (log the stack trace, never leak it).

> 🧒 **Like you're 5:** Instead of every teacher handling crying kids differently, there's one school nurse. All problems go to the nurse, who handles each kind the same way every time.

```java
@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setProperty("errors", e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, f -> String.valueOf(f.getDefaultMessage()), (a, b) -> a)));
        return pd;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unknown(Exception e) {
        log.error("Unhandled", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
    }
}
```

### ITEM sp-validation | Bean Validation: @Valid vs @Validated, custom validators | must
ask: Bean Validation: @Valid vs @Validated; custom validators.
card: Annotate fields with constraints (@NotBlank, @Email, @Size, @Positive, @Future). @Valid (Jakarta) triggers validation of a @RequestBody and cascades into nested objects. @Validated (Spring) on a class enables method-parameter validation (@RequestParam @Min(1)) and supports validation groups. Custom: create an annotation + ConstraintValidator.

> 🧒 **Like you're 5:** Validation is the form checker at the bank: "name can't be empty, age must be a number, email must have an @". It sends the form back before anyone wastes time on it.

```java
record CreateUserRequest(@NotBlank String name, @Email String email, @Min(18) int age,
                         @Valid @NotNull AddressDto address) {}

@Target(FIELD) @Retention(RUNTIME) @Constraint(validatedBy = IndianPhoneValidator.class)
@interface IndianPhone { String message() default "invalid phone"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }

class IndianPhoneValidator implements ConstraintValidator<IndianPhone, String> {
    public boolean isValid(String v, ConstraintValidatorContext c) { return v != null && v.matches("[6-9]\\d{9}"); }
}
```

### ITEM sp-security | Securing REST APIs: JWT, OAuth2, authentication vs authorization | must
ask: How do you secure REST APIs? JWT, OAuth2, authentication and authorization.
card: Authentication = who are you (login, token). Authorization = what may you do (roles/scopes). JWT = signed token (header.payload.signature) carrying claims (sub, roles, exp); the server verifies the signature without a DB lookup: stateless. OAuth2: an authorization server (Keycloak, Okta, Cognito) issues access tokens; your API is a resource server that validates them. Use short expiry + refresh tokens, HTTPS, never put secrets in JWT payload (it's only base64).

> 🧒 **Like you're 5:** Authentication is showing your ID at the gate. Authorization is the wristband that says which rides you're allowed on. A JWT is a wristband with a tamper-proof seal: staff can trust it just by looking at it.

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        .csrf(c -> c.disable())                                   // stateless token API
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> a
            .requestMatchers("/actuator/health", "/api/v1/auth/**").permitAll()
            .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))   // validates JWTs
        .build();
}
```

> ⚠️ **Trap:** JWTs can't be easily revoked before they expire. Keep them short-lived (5–15 min) and use a revocation list or refresh-token rotation for logout.

### ITEM sp-cors-csrf | CORS vs CSRF; the Spring Security filter chain | must
ask: CORS vs CSRF; how does the Spring Security filter chain work?
card: CORS = the browser's rule that blocks JS from reading responses from another origin unless the server allows it (Access-Control-Allow-Origin); it's about relaxing a browser restriction. CSRF = an attack where another site makes the user's browser send an authenticated request using its cookies; defend with CSRF tokens or SameSite cookies. Stateless JWT-in-header APIs can disable CSRF. Spring Security = a chain of filters (CORS, CSRF, authentication, exception translation, authorization) inside one FilterChainProxy.

> 🧒 **Like you're 5:** CORS is your house rule "only my friend's house may borrow my toys". CSRF is a trickster who sends a letter in YOUR name to your bank, hoping the bank trusts your signature cookie.

```java
@Bean
CorsConfigurationSource cors() {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(List.of("https://app.example.com"));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    var src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/api/**", c);
    return src;
}
```

### ITEM sp-ratelimit | API rate limiting and request correlation IDs | good
ask: How do you implement API rate limiting and request correlation IDs?
card: Rate limiting: token bucket per user/API key/IP; in one instance use Bucket4j or Resilience4j RateLimiter; across many instances keep counters in Redis (INCR + EXPIRE, or a Lua script) or do it at the API gateway. Return 429 Too Many Requests with Retry-After. Correlation ID: a filter reads X-Request-Id (or creates a UUID), puts it in MDC for logs, returns it in the response, and forwards it to downstream calls; OpenTelemetry trace IDs do this automatically.
patterns: ratelimit, gateway

> 🧒 **Like you're 5:** Rate limiting is a sweets jar that refills 10 sweets per minute: take more and you have to wait. A correlation ID is a sticker on a parcel so every post office can say "yes, I saw parcel #A17 pass by".

```java
@Component
class CorrelationIdFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = Optional.ofNullable(req.getHeader("X-Request-Id")).orElse(UUID.randomUUID().toString());
        MDC.put("requestId", id);
        res.setHeader("X-Request-Id", id);
        try { chain.doFilter(req, res); } finally { MDC.remove("requestId"); }
    }
}
```

## MODULE spring-data | Transactions, JPA & testing

### ITEM sp-tx-proxy | How @Transactional works: proxies and the self-invocation trap | must
ask: How does @Transactional work internally? Proxy-based behaviour and self-invocation.
card: Spring wraps the bean in a proxy (JDK dynamic proxy or CGLIB). Calls coming from OUTSIDE go through the proxy, which opens a transaction (binds a connection to the thread), calls your method, then commits, or rolls back on a RuntimeException/Error. Self-invocation (this.otherMethod()) skips the proxy, so @Transactional on otherMethod is ignored. Also ignored on private methods. Fix: move the method to another bean, or inject self / use TransactionTemplate.

> 🧒 **Like you're 5:** The proxy is a receptionist who says "starting a transaction!" before connecting your call to the manager. If the manager calls their own phone extension directly from inside the office, the receptionist never hears it.

```java
@Service
class OrderService {
    public void placeAll(List<Order> orders) {
        for (Order o : orders) save(o);   // ❌ this.save() → no proxy → no new transaction
    }
    @Transactional(propagation = REQUIRES_NEW)
    public void save(Order o) { ... }
}
```

> 🎯 **Say this in the interview:** "@Transactional is AOP through a proxy, so it only applies to public methods called from another bean. I keep transactions in the service layer and short: no remote HTTP calls inside them."

### ITEM sp-propagation | Transaction propagation: REQUIRED, REQUIRES_NEW, SUPPORTS, MANDATORY, NOT_SUPPORTED | must
ask: Explain propagation: REQUIRED, REQUIRES_NEW, SUPPORTS, MANDATORY, NOT_SUPPORTED.
card: REQUIRED (default) = join the current transaction or start one. REQUIRES_NEW = always start a new one, suspending the outer (used for audit logs that must save even if the outer rolls back). SUPPORTS = join if one exists, else run without. MANDATORY = must already be in one, else exception. NOT_SUPPORTED = suspend any transaction and run without. NEVER = fail if one exists. NESTED = savepoint inside the current one.

> 🧒 **Like you're 5:** REQUIRED: "I'll join your team, or start a team if there's none". REQUIRES_NEW: "I always play on my own new team". MANDATORY: "I only play if a team already exists".

| Propagation | Existing tx | No tx |
|---|---|---|
| REQUIRED | join | create |
| REQUIRES_NEW | suspend + create new | create |
| SUPPORTS | join | run without |
| MANDATORY | join | ❌ exception |
| NOT_SUPPORTED | suspend, run without | run without |
| NEVER | ❌ exception | run without |
| NESTED | savepoint | create |

> ⚠️ **Trap:** If an inner REQUIRED method throws and the outer catches it, the whole transaction is still marked rollback-only → `UnexpectedRollbackException` at commit.

### ITEM sp-isolation | Isolation levels: dirty read, non-repeatable read, phantom read | must
ask: Explain isolation levels and the anomalies: dirty read, non-repeatable read, phantom read.
card: Dirty read = reading another transaction's uncommitted data. Non-repeatable read = reading the same row twice gives different values (someone committed an update in between). Phantom read = re-running a range query returns new rows. READ UNCOMMITTED allows all; READ COMMITTED (Postgres/Oracle default) prevents dirty; REPEATABLE READ (MySQL InnoDB default) also prevents non-repeatable; SERIALIZABLE prevents all, slowest. Higher isolation = more locking/aborts.

> 🧒 **Like you're 5:** Dirty read: peeking at a friend's test answers before they've finished (they might erase them). Non-repeatable: you read the scoreboard twice and the score changed. Phantom: you count the kids in a room twice and a new kid appeared.

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| READ UNCOMMITTED | possible | possible | possible |
| READ COMMITTED | ✅ prevented | possible | possible |
| REPEATABLE READ | ✅ | ✅ | possible (InnoDB mostly prevents) |
| SERIALIZABLE | ✅ | ✅ | ✅ |

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public Report monthEnd() { ... }
```

### ITEM sp-rollback | Rollback rules: checked vs unchecked exceptions | must
ask: What are the rollback rules? How do checked and unchecked exceptions behave?
card: By default Spring rolls back on RuntimeException and Error, and COMMITS on checked exceptions. Change it with @Transactional(rollbackFor = Exception.class) or noRollbackFor. Catching an exception inside the method (and not rethrowing) means no rollback. You can force it with TransactionAspectSupport.currentTransactionStatus().setRollbackOnly().

> 🧒 **Like you're 5:** The undo button only presses itself for "surprise" errors (unchecked). For "expected" errors (checked) Spring thinks you handled it and saves your work, unless you tell it otherwise.

```java
@Transactional(rollbackFor = Exception.class)
public void importFile(Path p) throws IOException { ... }   // IOException now rolls back
```

> ⚠️ **Trap:** `try { repo.save(x); paymentClient.charge(); } catch (Exception e) { log.warn(...); }` swallows the failure and commits a half-done order.

### ITEM sp-locking | Optimistic vs pessimistic locking; @Version and lost updates | must
ask: Optimistic vs pessimistic locking; @Version and lost updates.
card: Lost update = two users read the same row, both change it, the second save silently overwrites the first. Optimistic locking: a @Version column; UPDATE ... WHERE id = ? AND version = ?; if 0 rows changed → OptimisticLockException → retry or tell the user. Best when conflicts are rare. Pessimistic: SELECT ... FOR UPDATE (@Lock(PESSIMISTIC_WRITE)) blocks others until commit. Best for hot rows with frequent conflicts (inventory, seat booking); risk of waits/deadlocks.

> 🧒 **Like you're 5:** Optimistic: everyone edits a copy of the shared drawing, and when you hand yours in the teacher checks "is this still version 3?". If someone already handed in version 4, you redo yours. Pessimistic: only one kid may hold the drawing at a time; others wait.

```java
@Entity
class Product {
    @Id Long id;
    int stock;
    @Version long version;      // JPA adds "AND version = ?" to updates
}

interface ProductRepo extends JpaRepository<Product, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findForUpdate(Long id);
}
```

### ITEM sp-persistence-context | Entity lifecycle, persistence context, dirty checking, flush vs commit | must
ask: Explain the JPA entity lifecycle, persistence context, dirty checking, and flush vs commit.
card: States: transient (new, unknown to JPA), managed (in the persistence context), detached (context closed), removed. The persistence context is a first-level cache per transaction: one object per row. Dirty checking: at flush, Hibernate compares managed entities to their snapshot and writes UPDATEs automatically (no save() needed). Flush = send pending SQL to the DB (before queries, at commit, or flush()). Commit = make it permanent. You can flush without committing.

> 🧒 **Like you're 5:** The persistence context is a notepad. While the transaction is open, Hibernate watches every object you loaded. When it's time to save, it checks the notepad for scribbles and writes only the changes to the database.

```java
@Transactional
public void rename(long id, String name) {
    Customer c = repo.findById(id).orElseThrow();   // managed
    c.setName(name);                                // no save() needed: dirty checking → UPDATE at commit
}
```

```diagram
new Customer() ──persist──► MANAGED ──tx ends/clear──► DETACHED ──merge──► MANAGED
   (transient)                 │ remove
                               ▼
                            REMOVED ──flush──► DELETE
```

### ITEM sp-n-plus-one | Lazy vs eager loading; N+1 problem; fetch join and entity graphs | must
ask: Lazy vs eager loading; the N+1 problem; fetch join and entity graphs.
card: LAZY = load the association only when accessed (default for @OneToMany/@ManyToMany); EAGER = load immediately (default for @ManyToOne/@OneToOne: usually change to LAZY). N+1 = 1 query for N orders, then 1 more query per order for its items. Fix: JOIN FETCH in JPQL, @EntityGraph(attributePaths = "items"), or batch fetching (hibernate.default_batch_fetch_size). Detect it with SQL logging or Hibernate statistics. LazyInitializationException = touching a lazy field after the session closed.

> 🧒 **Like you're 5:** N+1 is asking your mom for 10 snacks by walking to the kitchen 10 separate times. A fetch join is bringing a tray and getting all 10 in one trip.

```java
// N+1: 1 query + 100 queries
List<Order> orders = orderRepo.findAll();
orders.forEach(o -> o.getItems().size());

// fixed: 1 query
@Query("select distinct o from Order o join fetch o.items where o.status = :s")
List<Order> findWithItems(Status s);

@EntityGraph(attributePaths = {"items", "customer"})
List<Order> findByStatus(Status s);
```

> ⚠️ **Trap:** JOIN FETCH on a collection + pagination makes Hibernate paginate in memory (warning HHH90003004). Fetch IDs page-wise first, then fetch the entities with their collections.

### ITEM sp-cascade | Cascade types vs orphanRemoval; owning side of relationships | good
ask: Cascade types vs orphanRemoval; the owning side of relationships.
card: Cascade = apply an operation (PERSIST, MERGE, REMOVE, ALL) from parent to children. orphanRemoval = delete a child row when it's removed from the parent's collection. Owning side = the side with the foreign key (@ManyToOne / @JoinColumn); only changes there are saved. The other side uses mappedBy and is just a mirror: keep both sides in sync with helper methods (addItem sets item.order = this).

> 🧒 **Like you're 5:** Cascade: if you move the toy box, the toys move with it. orphanRemoval: if you take a toy out of the box, it goes in the bin. The owning side is the toy with the name tag saying which box it belongs to.

```java
@Entity class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
    void addItem(OrderItem i) { items.add(i); i.setOrder(this); }      // keep both sides in sync
}
@Entity class OrderItem {
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id")  // owning side
    private Order order;
}
```

> ⚠️ **Trap:** Never `cascade = REMOVE` on `@ManyToOne` (deleting one item would delete the parent order and every other item).

### ITEM sp-queries | JPQL vs native SQL vs derived queries vs Specification | good
ask: JPQL vs native SQL vs derived queries vs JPA Specification.
card: Derived queries (findByStatusAndCreatedAtAfter) = method names → queries, great for simple cases. JPQL (@Query) = queries on entities and fields, DB-independent. Native SQL (nativeQuery = true) = DB-specific features (window functions, JSON ops, hints), maps less nicely. Specification / Criteria = build queries dynamically from optional filters (search screens). Projections (interfaces/records) fetch only needed columns.

> 🧒 **Like you're 5:** Derived query = ordering from a set menu by name. JPQL = describing your meal in Spring's language. Native SQL = talking to the chef in their own language. Specification = building your meal from checkboxes.

```java
List<Order> findTop10ByCustomerIdOrderByCreatedAtDesc(long customerId);      // derived

@Query("select new com.x.OrderSummary(o.id, o.total) from Order o where o.total > :min")
List<OrderSummary> bigOrders(BigDecimal min);                                   // JPQL + projection

static Specification<Order> hasStatus(Status s) { return (root, q, cb) -> s == null ? null : cb.equal(root.get("status"), s); }
orderRepo.findAll(hasStatus(status).and(createdAfter(from)), pageable);       // dynamic filters
```

### ITEM sp-testing | Testing controllers, services and repositories | must
ask: How do you test controllers, services and repositories? JUnit, Mockito, MockMvc, Testcontainers.
card: Unit tests (fast, most of them): JUnit 5 + Mockito for services, mocking repositories/clients. Web slice: @WebMvcTest + MockMvc for controllers (JSON, status codes, validation) with @MockBean services. Data slice: @DataJpaTest for repositories, ideally against a real DB with Testcontainers (H2 hides DB differences). Full: @SpringBootTest for a few end-to-end flows; WireMock for external HTTP APIs. Test pyramid: many unit, fewer integration, few E2E.

> 🧒 **Like you're 5:** Unit test = checking one Lego brick. Slice test = checking one Lego room. @SpringBootTest = checking the whole Lego castle. Testcontainers = a real mini-database in a box just for the test.

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository repo;
    @Mock PaymentClient payment;
    @InjectMocks OrderService service;

    @Test void failsWhenPaymentDeclined() {
        when(payment.charge(any())).thenReturn(Result.DECLINED);
        assertThrows(PaymentFailedException.class, () -> service.place(new OrderRequest(1L, 500)));
        verify(repo, never()).save(any());
    }
}

@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockBean OrderService service;
    @Test void returns404() throws Exception {
        when(service.get(9L)).thenThrow(new OrderNotFoundException(9L));
        mvc.perform(get("/api/v1/orders/9")).andExpect(status().isNotFound());
    }
}
```
