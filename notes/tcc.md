# TCC (Try – Confirm – Cancel)

**In one line:** First **reserve** the resource (Try). If every service reserved OK, **Confirm** all of them. If any fails, **Cancel** all reservations.

---

## 1. Real-life example

**Booking a movie seat** on an app: when you select a seat, it's **held for 10 minutes** (Try). If you pay, the seat is **booked** (Confirm). If you don't pay or payment fails, the hold is **released** (Cancel) and others can book it.

## 2. How is it different from Saga?

| Saga | TCC |
|---|---|
| Each step **really does** the work, then **undoes** on failure (refund) | First only **reserves**, nothing final happens until Confirm |
| Others may see the real effect before undo | Others see only a "reserved/held" state |
| Compensation can be messy (refund fees, emails sent) | Cancel is just "release the hold" – cleaner |
| Easier to add to existing services | Every service must support 3 operations |

TCC is like 2PC done at the **business level** (no DB locks held across services).

## 3. The three steps

1. **Try** – check rules and **reserve** (seat → HELD, money → frozen). Must be fast.
2. **Confirm** – make the reservation final (seat → BOOKED). Must succeed if Try succeeded.
3. **Cancel** – release the reservation (seat → AVAILABLE).

## 4. Build task – seat booking flow in Spring Boot

### Seat entity

```java
@Entity
@Getter @Setter
public class Seat {
    @Id private String seatNo;
    @Enumerated(EnumType.STRING)
    private SeatStatus status;          // AVAILABLE, HELD, BOOKED
    private String holdId;              // which booking holds it
    private Instant holdExpiresAt;
    @Version private Long version;      // stops two people holding at once
}
```

### Seat service with Try / Confirm / Cancel

```java
@Service
@RequiredArgsConstructor
public class SeatTccService {
    private final SeatRepository seats;

    @Transactional
    public void tryHold(String seatNo, String bookingId) {
        Seat s = seats.findById(seatNo).orElseThrow();
        if (bookingId.equals(s.getHoldId())) return;                 // idempotent: already held by us
        if (s.getStatus() != SeatStatus.AVAILABLE) throw new IllegalStateException("Seat not available");
        s.setStatus(SeatStatus.HELD);
        s.setHoldId(bookingId);
        s.setHoldExpiresAt(Instant.now().plus(Duration.ofMinutes(10)));
    }

    @Transactional
    public void confirm(String seatNo, String bookingId) {
        Seat s = seats.findById(seatNo).orElseThrow();
        if (s.getStatus() == SeatStatus.BOOKED && bookingId.equals(s.getHoldId())) return; // idempotent
        if (s.getStatus() != SeatStatus.HELD || !bookingId.equals(s.getHoldId()))
            throw new IllegalStateException("No valid hold");
        s.setStatus(SeatStatus.BOOKED);
        s.setHoldExpiresAt(null);
    }

    @Transactional
    public void cancel(String seatNo, String bookingId) {
        Seat s = seats.findById(seatNo).orElse(null);
        if (s == null) return;
        if (s.getStatus() == SeatStatus.HELD && bookingId.equals(s.getHoldId())) {   // only release OUR hold
            s.setStatus(SeatStatus.AVAILABLE);
            s.setHoldId(null);
            s.setHoldExpiresAt(null);
        }
        // already cancelled / never held → do nothing (idempotent)
    }

    // safety net: release expired holds if the coordinator never called confirm/cancel
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void releaseExpired() {
        seats.findByStatusAndHoldExpiresAtBefore(SeatStatus.HELD, Instant.now())
             .forEach(s -> { s.setStatus(SeatStatus.AVAILABLE); s.setHoldId(null); });
    }
}
```

The **wallet/payment service** has the same three: `tryFreeze(amount)`, `confirm()` (deduct), `cancel()` (unfreeze).

### Coordinator

```java
@Service
@RequiredArgsConstructor
public class BookingCoordinator {
    private final SeatTccService seat;       // in real life: remote clients
    private final WalletTccClient wallet;

    public String book(String seatNo, String userId, double price) {
        String bookingId = UUID.randomUUID().toString();
        try {
            // TRY phase
            seat.tryHold(seatNo, bookingId);
            wallet.tryFreeze(userId, price, bookingId);
        } catch (Exception e) {
            // CANCEL phase – call on all, even ones that may not have run
            safe(() -> seat.cancel(seatNo, bookingId));
            safe(() -> wallet.cancel(userId, bookingId));
            throw new IllegalStateException("Booking failed: " + e.getMessage());
        }
        // CONFIRM phase – retry until success (confirm must not fail logically)
        retryForever(() -> seat.confirm(seatNo, bookingId));
        retryForever(() -> wallet.confirm(userId, bookingId));
        return bookingId;
    }
}
```

## 5. Points to explain in an interview

- **No isolation:** between Try and Confirm, other users see "HELD" / frozen money. That's fine for seats, but you must design these in-between states.
- **Cancel must be idempotent:** the coordinator may call Cancel twice (retry after timeout). Calling it again must do nothing harmful.
- **Empty cancel (null compensation):** Cancel may arrive for a Try that never ran (Try request got lost). Cancel must handle "nothing to cancel".
- **Hanging Try:** a delayed Try arrives *after* Cancel → it must be rejected, otherwise the seat stays held forever. Keep a record of cancelled booking ids.
- Confirm/Cancel are retried until they succeed; holds have **expiry** as a safety net.
- Frameworks: **Seata** (TCC mode) in Java.

## 6. Quick revision

- Try = reserve, Confirm = finalize, Cancel = release.
- Cleaner than Saga compensation, but every service needs 3 APIs.
- Idempotent Cancel, handle empty cancel and hanging try, use hold expiry.
