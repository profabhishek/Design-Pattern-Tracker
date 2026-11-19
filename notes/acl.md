# Anti-Corruption Layer (ACL)

**In one line:** A **translator layer** between your clean new code and an old/external system, so the old system's messy model doesn't "corrupt" your design.

---

## 1. Real-life example

A **translator** at an international meeting. The Japanese delegate speaks Japanese, you speak English. The translator converts both ways. You don't have to learn Japanese, and your notes stay in English.

## 2. What problem does it solve?

Legacy/external systems often have strange models:

```json
{ "CUST_NO": "000042", "NM_FST": "RAVI", "NM_LST": "KUMAR",
  "STS_CD": "A", "DOB": "19990512", "ADDR_LN1": "...", "FLG_VIP": "Y" }
```

If your new code uses this directly, your whole codebase fills up with `STS_CD == "A"` and date parsing everywhere. Later, changing the legacy system breaks everything.

The ACL keeps **legacy words outside**, and your domain uses **your own clean model**:

```java
new Customer(42L, "Ravi Kumar", Status.ACTIVE, LocalDate.of(1999, 5, 12), true);
```

## 3. Structure

```diagram
caption: Where the Anti-Corruption Layer sits
flow: [Your domain | CustomerService · LoanService | uses clean `Customer`]{accent} -> (asks the port) [Anti-Corruption Layer | CustomerGateway (port) | LegacyCustomerAdapter | CustomerTranslator]{warn} -> (old API call) [Legacy / external system | old SOAP/REST API | LegacyCustomerDto]{muted}
note: Legacy words like `CUST_NO` and `STS_CD` never cross into your domain. Only the ACL knows them.
```

It uses **Adapter** + **Facade** + translation (mapper).

## 4. Build task – adapter that maps a legacy model to your domain model

### Your clean domain

```java
public enum CustomerStatus { ACTIVE, BLOCKED, CLOSED }

public record Customer(Long id, String fullName, CustomerStatus status,
                       LocalDate birthDate, boolean vip) { }

// the "port" – your domain only knows this interface
public interface CustomerGateway {
    Optional<Customer> findById(Long id);
}
```

### Legacy DTO (lives ONLY inside the ACL package)

```java
@JsonIgnoreProperties(ignoreUnknown = true)
record LegacyCustomerDto(
        @JsonProperty("CUST_NO") String custNo,
        @JsonProperty("NM_FST") String firstName,
        @JsonProperty("NM_LST") String lastName,
        @JsonProperty("STS_CD") String statusCode,
        @JsonProperty("DOB") String dob,
        @JsonProperty("FLG_VIP") String vipFlag) { }
```

### Translator

```java
@Component
class LegacyCustomerTranslator {
    private static final DateTimeFormatter DOB = DateTimeFormatter.ofPattern("yyyyMMdd");

    Customer toDomain(LegacyCustomerDto d) {
        return new Customer(
                Long.parseLong(d.custNo()),                         // "000042" → 42
                capitalize(d.firstName()) + " " + capitalize(d.lastName()),
                switch (d.statusCode()) {
                    case "A" -> CustomerStatus.ACTIVE;
                    case "B" -> CustomerStatus.BLOCKED;
                    case "C", "X" -> CustomerStatus.CLOSED;
                    default -> throw new IllegalArgumentException("Unknown status " + d.statusCode());
                },
                d.dob() == null || d.dob().isBlank() ? null : LocalDate.parse(d.dob(), DOB),
                "Y".equalsIgnoreCase(d.vipFlag()));
    }

    private String capitalize(String s) {
        return s == null || s.isEmpty() ? "" : s.charAt(0) + s.substring(1).toLowerCase();
    }
}
```

### Adapter (calls legacy, uses translator)

```java
@Component
@RequiredArgsConstructor
class LegacyCustomerAdapter implements CustomerGateway {
    private final RestClient legacyClient;            // configured with legacy base URL + timeouts
    private final LegacyCustomerTranslator translator;

    @Override
    public Optional<Customer> findById(Long id) {
        String legacyId = String.format("%06d", id);  // legacy wants 6-digit, zero-padded ids
        try {
            LegacyCustomerDto dto = legacyClient.get()
                    .uri("/cust/inq?CUST_NO={id}", legacyId)
                    .retrieve().body(LegacyCustomerDto.class);
            return Optional.ofNullable(dto).map(translator::toDomain);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
}
```

### Your domain service – no legacy words at all

```java
@Service
@RequiredArgsConstructor
public class LoanService {
    private final CustomerGateway customers;

    public boolean canApply(Long customerId) {
        Customer c = customers.findById(customerId).orElseThrow();
        return c.status() == CustomerStatus.ACTIVE;
    }
}
```

Tip: keep `LegacyCustomerDto`, translator and adapter **package-private** in a package like `com.shop.acl.legacycrm`, so nobody else can use the legacy model.

## 5. Who owns the translation layer? Its cost?

- Usually the **team building the new system** owns the ACL (they care about a clean model).
- It can be a package inside your service, or a **separate small service** if many teams use the same legacy system.
- **Cost:** extra code, extra mapping tests, small latency; must be updated when legacy changes. But it's **one place** to change instead of everywhere.
- Often used together with **Strangler Fig** during migrations.

## 6. Quick revision

- ACL = translator between legacy model and your clean model.
- Adapter + translator, legacy classes stay hidden.
- Owned by the new team; costs extra code but protects your design.
