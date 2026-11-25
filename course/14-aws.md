# TRACK aws
title: AWS for Java Backend
icon: ☁️
color: #f59e0b
tier: bonus
about: Compute, containers, storage, databases, messaging, security, networking and observability on AWS. Study deeper if the job description asks for AWS.

## MODULE aws-compute | Compute, containers & deployment

### ITEM aws-compute-choice | EC2 vs ECS vs EKS vs Lambda | good
ask: EC2 vs ECS vs EKS vs Lambda: when would you choose each?
card: EC2 = virtual machines, full control, you manage OS/patching/scaling. ECS = AWS's container orchestrator (simple, on EC2 or serverless Fargate). EKS = managed Kubernetes (portable, huge ecosystem, more complex). Lambda = functions run on events, pay per request, auto-scale to zero, 15-min limit, cold starts. Long-running Spring Boot APIs → ECS Fargate or EKS; spiky event handlers/glue → Lambda; special needs (GPU, legacy) → EC2.

> 🧒 **Like you're 5:** EC2 = renting an empty flat (you furnish it). ECS/EKS = a serviced apartment where staff handle cleaning (containers). Lambda = a hotel room by the hour: show up, use it, leave.

| | EC2 | ECS (Fargate) | EKS | Lambda |
|---|---|---|---|---|
| You manage | OS, runtime, scaling | Task definitions | K8s objects | Just code |
| Best for | Full control | Simple container apps | K8s teams, multi-cloud | Events, spiky load |
| Scale to zero | ❌ | ❌ (min tasks) | ❌ | ✅ |

### ITEM aws-lambda | How Lambda works: cold starts, concurrency, timeout, memory | good
ask: How does AWS Lambda work? Cold starts, concurrency, timeout and memory settings.
card: An event triggers a function; AWS runs it in a micro-VM (Firecracker). Cold start = first request (or scale-out) must start the environment + JVM + your init code: Java can take seconds. Fixes: SnapStart (snapshot after init), provisioned concurrency, smaller dependencies, lightweight frameworks. Concurrency = number of instances running at once (account limit, reserved concurrency per function). Timeout up to 15 min. Memory 128 MB–10 GB, and CPU scales with memory.

> 🧒 **Like you're 5:** A food truck that only opens when a customer arrives. The first customer waits while the cook starts the stove (cold start). The next customers are served fast because the stove is already hot.

### ITEM aws-lambda-invoke | Lambda sync vs async invocation; retries, DLQ and destinations | bonus
ask: Lambda synchronous vs asynchronous invocation; retries and DLQ / destinations.
card: Sync (API Gateway, SDK invoke): caller waits, errors go back to the caller, no automatic retry. Async (S3, SNS, EventBridge): Lambda queues the event, retries twice on error, then sends it to a DLQ (SQS/SNS) or an on-failure destination. Poll-based (SQS, Kinesis, DynamoDB Streams): Lambda polls; on failure the batch is retried until success/expiry, so use partial batch responses and a DLQ on the queue.

> 🧒 **Like you're 5:** Sync is asking a question face to face. Async is leaving a note: if nobody answers, the note gets re-sent twice, then filed in a "couldn't handle" folder.

### ITEM aws-deploy-spring | Deploying a Spring Boot service on EC2, ECS or EKS | good
ask: How do you deploy a Spring Boot service on EC2, ECS or EKS?
card: Build a jar → container image (Dockerfile or Buildpacks/Jib) → push to ECR. ECS: task definition (image, CPU/memory, env, secrets from Secrets Manager, logs to CloudWatch) + service behind an ALB with health checks on /actuator/health. EKS: Deployment + Service + Ingress (AWS Load Balancer Controller), probes, HPA, IRSA for IAM. EC2: AMI or user-data + systemd + Auto Scaling Group + ALB. All via CI/CD (GitHub Actions/CodePipeline) and IaC.

> 🧒 **Like you're 5:** Pack your app in a lunchbox (container image), put it in the school locker (ECR), and tell the canteen (ECS/EKS) how many copies to serve and how to check they're not spoiled (health checks).

### ITEM aws-docker | Docker image layers, multi-stage builds, health checks, resource limits | good
ask: Docker image layers, multi-stage builds, health checks and container resource limits.
card: Each Dockerfile instruction makes a cached layer: put rarely-changing steps (dependencies) before often-changing ones (your code). Multi-stage: build with a JDK image, copy only the jar into a small JRE image (smaller, safer). Health checks tell the orchestrator if the app is alive/ready. Set CPU/memory limits; modern JVMs respect container limits, tune heap with -XX:MaxRAMPercentage=75. Run as a non-root user.

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw -q dependency:go-offline          # cached layer
COPY src src
RUN ./mvnw -q package -DskipTests

FROM eclipse-temurin:21-jre
RUN useradd -r app
USER app
COPY --from=build /src/target/app.jar /app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
HEALTHCHECK CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

> 🧒 **Like you're 5:** Layers are a stack of pancakes; if only the top pancake changes, you don't remake the whole stack.

### ITEM aws-k8s | Kubernetes: pods, deployments, services, ingress, autoscaling | good
ask: How does Kubernetes manage pods, deployments, services, ingress and autoscaling?
card: Pod = one or more containers scheduled together (smallest unit). Deployment = desired number of identical pods + rolling updates/rollbacks (via ReplicaSets). Service = stable virtual IP/DNS that load-balances to matching pods. Ingress = HTTP routing from outside to services. HPA = scales pod count on CPU/memory/custom metrics; Cluster Autoscaler adds nodes. Probes: liveness (restart if stuck), readiness (only send traffic when ready). ConfigMaps/Secrets for config.

> 🧒 **Like you're 5:** You tell Kubernetes "I always want 3 ice-cream stalls open". If one stall closes, it opens another. A sign at the park entrance (Service) points people to any open stall.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: orders }
spec:
  replicas: 3
  selector: { matchLabels: { app: orders } }
  template:
    metadata: { labels: { app: orders } }
    spec:
      containers:
        - name: orders
          image: 123.dkr.ecr.ap-south-1.amazonaws.com/orders:1.4.2
          resources: { requests: { cpu: 500m, memory: 768Mi }, limits: { memory: 1Gi } }
          readinessProbe: { httpGet: { path: /actuator/health/readiness, port: 8080 } }
          livenessProbe:  { httpGet: { path: /actuator/health/liveness,  port: 8080 } }
```

### ITEM aws-deploy-strategies | Blue-green vs canary vs rolling deployment; rollback | must
ask: Blue-green vs canary vs rolling deployment; rollback strategy.
card: Rolling = replace instances a few at a time (default in K8s/ECS; cheap; mixed versions during rollout). Blue-green = run the new version (green) next to the old (blue), switch all traffic at once, switch back to roll back instantly (double cost briefly). Canary = send a small % of traffic to the new version, watch metrics (errors, latency), then increase or roll back automatically. DB changes must be backward compatible (expand-contract) so rollback is safe. Feature flags decouple deploy from release.
patterns: bluegreen, canary

> 🧒 **Like you're 5:** Rolling = changing a car's tyres one at a time while driving slowly. Blue-green = having a second ready car and jumping into it. Canary = letting one friend taste the new recipe before serving everyone.

## MODULE aws-data | Storage, databases & messaging

### ITEM aws-s3 | S3 storage classes, versioning, lifecycle, encryption, pre-signed URLs | good
ask: Explain S3 storage classes, versioning, lifecycle policies, encryption and pre-signed URLs.
card: S3 = object storage (buckets + keys), 11 nines durability. Classes: Standard (hot), Intelligent-Tiering (auto), Standard-IA/One Zone-IA (infrequent), Glacier tiers (archive, slower/cheaper). Versioning keeps old versions (protects from deletes). Lifecycle rules move objects to cheaper classes or delete them after N days. Encryption: SSE-S3 (default), SSE-KMS (audit + key control), client-side. Block Public Access on. Pre-signed URL = a temporary signed link so clients upload/download directly without your server or AWS credentials.

> 🧒 **Like you're 5:** S3 is a gigantic storage warehouse. Hot boxes stay near the door, old boxes go to the cheap basement (Glacier). A pre-signed URL is a one-time visitor pass that expires in 10 minutes.

```java
PresignedPutObjectRequest p = presigner.presignPutObject(b -> b
    .signatureDuration(Duration.ofMinutes(10))
    .putObjectRequest(o -> o.bucket("invoices").key("u42/" + UUID.randomUUID() + ".pdf")));
return p.url();     // browser uploads straight to S3
```

### ITEM aws-s3-events | S3 event notifications; avoiding duplicate processing | bonus
ask: How do S3 event notifications work, and how do you avoid processing the same event twice?
card: S3 can emit events (ObjectCreated, ObjectRemoved) to SQS, SNS, Lambda or EventBridge. Delivery is at-least-once and can be out of order, so consumers must be idempotent: dedupe on bucket + key + versionId/ETag/sequencer in a DynamoDB table with a conditional write, or make the processing naturally idempotent (overwrite the same output key). Route through SQS for buffering, retries and a DLQ.
patterns: idempotency, dlq

### ITEM aws-rds-dynamo | RDS vs DynamoDB; relational vs NoSQL modeling | good
ask: RDS vs DynamoDB; relational vs NoSQL data modeling.
card: RDS/Aurora = managed relational DB (Postgres/MySQL): joins, transactions, flexible queries, vertical + read replica scaling. DynamoDB = managed key-value/document store: single-digit ms at any scale, serverless, pay per request, but you design the table around known access patterns (partition key + sort key, often single-table design); no joins, limited queries. Pick RDS for complex/changing queries and relational data; DynamoDB for huge scale with simple, known access patterns.

> 🧒 **Like you're 5:** RDS is a librarian who can answer any question by checking many books. DynamoDB is a super-fast locker room: give the exact locker number and it opens instantly, but it can't answer "find all red bags".

### ITEM aws-dynamo-keys | DynamoDB partition key, sort key, GSI, LSI, hot partitions, capacity modes | bonus
ask: Explain DynamoDB partition key, sort key, GSI, LSI, hot partitions and capacity modes.
card: Partition key decides which partition stores the item (hash); sort key orders items inside a partition (range queries like begins_with). GSI = a new index with a different partition/sort key (eventually consistent, own capacity). LSI = same partition key, different sort key, created with the table. Hot partition = too much traffic on one key (e.g. date as PK) → throttling; use high-cardinality keys or write sharding. Capacity: on-demand (pay per request) or provisioned (+ auto scaling).

```text
PK = USER#42          SK = ORDER#2026-11-25#9001   → all orders of a user, sorted by date
GSI1: PK = STATUS#PAID SK = 2026-11-25             → all paid orders by date
```

### ITEM aws-dynamo-writes | DynamoDB conditional writes, transactions, TTL, optimistic locking | bonus
ask: DynamoDB conditional writes, transactions, TTL and optimistic locking.
card: Conditional write = only write if a condition holds (attribute_not_exists(pk) for create-once/idempotency; version = :expected for optimistic locking). TransactWriteItems = up to 100 items all-or-nothing (2× cost). TTL attribute = epoch seconds; items are deleted automatically (eventually, within ~48h). The Java SDK enhanced client supports @DynamoDbVersionAttribute for optimistic locking.

### ITEM aws-sqs | SQS Standard vs FIFO; visibility timeout, long polling, DLQ, redrive | good
ask: SQS Standard vs FIFO; visibility timeout, long polling, DLQ and redrive.
card: Standard = nearly unlimited throughput, at-least-once, best-effort order. FIFO = exactly-once processing within a 5-min dedup window and strict order per message group id, lower throughput. Visibility timeout = after a consumer receives a message it's hidden for N seconds; delete it when done, else it reappears (set > processing time). Long polling (WaitTimeSeconds up to 20) cuts empty responses and cost. maxReceiveCount → move to a DLQ; redrive moves messages back after a fix.
patterns: dlq

> 🧒 **Like you're 5:** A to-do board. When you take a card, it becomes invisible to others for 30 seconds. Finish and tear it up (delete), or it reappears for someone else. Cards that fail 5 times go to the "problem" board.

### ITEM aws-sns-sqs | SNS vs SQS; fan-out pattern | good
ask: SNS vs SQS; the fan-out pattern; SNS to SQS subscription.
card: SNS = pub/sub push: one message to many subscribers (SQS, Lambda, HTTP, email, SMS); no storage, no retry beyond delivery policies. SQS = a queue that stores messages until a consumer pulls them. Fan-out: publish once to an SNS topic, subscribe several SQS queues (one per consuming service) so each service gets its own durable copy and processes at its own pace. Use message filtering on subscriptions.

```diagram
Order service → SNS "order-events"
                  ├──► SQS inventory-queue → inventory service
                  ├──► SQS email-queue     → notification service
                  └──► SQS analytics-queue → analytics
```

### ITEM aws-eventbridge | EventBridge vs SNS vs SQS; event-driven architecture | bonus
ask: EventBridge vs SNS vs SQS; event-driven architecture use cases.
card: EventBridge = an event bus with content-based routing rules (match on any JSON field), schema registry, archive/replay, scheduled events, SaaS integrations; higher latency/lower throughput than SNS. SNS = simple high-throughput fan-out. SQS = buffering/work queue. Typical: services publish domain events to EventBridge, rules route them to SQS/Lambda targets; schedules replace cron servers.

### ITEM aws-kinesis | Kinesis vs Kafka; shards, ordering, consumer scaling | bonus
ask: Kinesis vs Kafka; shards, ordering and consumer scaling.
card: Both are partitioned, ordered, replayable logs. Kinesis Data Streams: fully managed, shards (1 MB/s or 1,000 records/s in per shard), order per partition key within a shard, retention 24h–365 days, consumers via KCL/Lambda, enhanced fan-out. Kafka (or MSK): more control, richer ecosystem (Connect, Streams, exactly-once), consumer groups, but you (or MSK) run brokers. Scale consumers up to the number of shards/partitions.

## MODULE aws-ops | Security, networking, observability & operations

### ITEM aws-iam | IAM users, roles, policies, least privilege, role assumption | good
ask: IAM users, roles, policies and least-privilege access; role assumption.
card: User = a long-term identity (avoid for apps). Role = an identity with temporary credentials that services/people assume (EC2 instance profile, ECS task role, EKS IRSA, cross-account). Policy = JSON allow/deny on actions + resources (+ conditions). Least privilege = only the exact actions and resources needed. Explicit Deny always wins. STS AssumeRole returns temporary keys. Never put access keys in code.

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::invoices-prod/*"
}
```

> 🧒 **Like you're 5:** A role is a costume with a name badge ("delivery person: may enter the lobby only"). Apps wear the costume for a while instead of carrying the master key.

### ITEM aws-secrets | Secrets Manager vs SSM Parameter Store vs KMS | good
ask: Secrets Manager vs SSM Parameter Store vs KMS.
card: KMS = manages encryption keys (create, rotate, encrypt/decrypt small data, used by other services); it doesn't store your secrets. Secrets Manager = stores secrets (DB passwords, API keys) encrypted with KMS, automatic rotation (e.g. RDS), cross-account, costs per secret. SSM Parameter Store = config + SecureString secrets, cheaper/free tier, no built-in rotation. Spring: spring.config.import=aws-secretsmanager:... or aws-parameterstore:.

### ITEM aws-envelope | Envelope encryption; encrypting data in S3 and RDS | bonus
ask: How does envelope encryption work? How is data encrypted in S3 and RDS?
card: KMS generates a data key; you encrypt the data with the plaintext data key (fast, locally), then store the data key encrypted by the KMS master key (CMK) next to the data and throw away the plaintext key. To decrypt, ask KMS to decrypt the data key, then decrypt the data. Master key never leaves KMS; large data never goes to KMS. S3 SSE-KMS and RDS encryption at rest do this for you; TLS covers data in transit.

> 🧒 **Like you're 5:** Lock the treasure chest with a small key, then lock that small key inside a safe that only the bank (KMS) can open. Store the locked small key taped to the chest.

### ITEM aws-vpc | VPC, public/private subnets, route tables, NAT gateway, security groups | good
ask: Explain VPC, public/private subnets, route tables, NAT gateway and security groups.
card: VPC = your private network. Public subnet = route table has a route to the Internet Gateway (load balancers, bastions). Private subnet = no direct internet route (apps, DBs); outbound internet via a NAT Gateway in a public subnet. Security group = stateful firewall on an instance/ENI (allow rules only, return traffic automatic); NACL = stateless firewall on a subnet. Spread subnets across AZs for high availability. VPC endpoints let private subnets reach S3/DynamoDB without NAT.

```diagram
Internet → IGW → [public subnet: ALB, NAT]  (AZ-a, AZ-b)
                      ↓
             [private subnet: ECS tasks]  → SG allows 8080 only from ALB SG
                      ↓
             [private subnet: RDS]        → SG allows 5432 only from app SG
```

### ITEM aws-alb-nlb | ALB vs NLB; health checks and target groups | good
ask: ALB vs NLB; health checks and target groups.
card: ALB = Layer 7 (HTTP/HTTPS): path/host/header routing, TLS termination, WebSockets, gRPC, auth integration, WAF. NLB = Layer 4 (TCP/UDP/TLS): extreme throughput, very low latency, static IPs, preserves source IP. Target group = a set of targets (instances, IPs, Lambda) with a health check; unhealthy targets get no traffic. Use ALB for REST APIs; NLB for non-HTTP protocols or static IP needs.

### ITEM aws-cloudwatch | CloudWatch Logs, Metrics, Alarms, dashboards, custom metrics | good
ask: CloudWatch Logs, Metrics, Alarms and dashboards; custom application metrics.
card: Logs = log groups/streams (ECS awslogs, Lambda automatic), query with Logs Insights. Metrics = AWS service metrics + custom metrics (Micrometer CloudWatch registry or Embedded Metric Format in logs). Alarms trigger on thresholds/anomalies → SNS → PagerDuty/Slack, or autoscaling. Dashboards combine graphs. Log structured JSON with a trace id. Watch metric cardinality (cost).

```text
fields @timestamp, level, message, traceId
| filter level = "ERROR" and service = "orders"
| stats count() by bin(5m)
```

### ITEM aws-tracing | CloudTrail vs CloudWatch; tracing with X-Ray / OpenTelemetry | good
ask: CloudTrail vs CloudWatch; tracing with X-Ray / OpenTelemetry.
card: CloudTrail = audit log of AWS API calls (who deleted that bucket, from where): security and compliance. CloudWatch = operational monitoring of your apps and resources (metrics, logs, alarms). Distributed tracing = follow one request across services as spans with a shared trace id: X-Ray natively, or OpenTelemetry (vendor-neutral; the AWS Distro for OTel can send to X-Ray, Grafana, Datadog). In Spring Boot 3: Micrometer Tracing + OTel exporter.

> 🧒 **Like you're 5:** CloudTrail is the CCTV of who opened which door in the building. CloudWatch is the health monitor on each machine. Tracing is following one parcel's GPS through every post office.

### ITEM aws-lambda-debug | Troubleshooting Lambda timeouts, throttling, out-of-memory and permission errors | bonus
ask: How do you troubleshoot Lambda timeout, throttling, out-of-memory and permission errors?
card: Timeout: check logs/X-Ray for the slow call (often a downstream without its own timeout, or a VPC Lambda without a NAT/endpoint so calls hang); set client timeouts below the Lambda timeout. Throttling (429/TooManyRequests): concurrency limit reached → raise the account limit, set reserved concurrency, smooth load with SQS. OOM: "Runtime exited... memory" → raise memory (also more CPU), stream large files. AccessDenied: the execution role lacks a permission or a resource policy/KMS key policy blocks it → read the exact action/ARN in the error and add a least-privilege policy.

### ITEM aws-ha | Designing a highly available, fault-tolerant backend on AWS | good
ask: How do you design a highly available and fault-tolerant backend on AWS?
card: Remove single points of failure: multiple AZs for everything (ALB, ECS/EKS tasks spread, RDS Multi-AZ or Aurora with replicas, ElastiCache replicas). Stateless services with autoscaling and health checks. Queues (SQS) to absorb spikes and decouple. Backups + point-in-time restore; tested runbooks. Timeouts, retries, circuit breakers in code. For region failure: multi-region with Route 53 failover, DynamoDB global tables/Aurora Global Database (RTO/RPO decide how far to go). Monitoring + alarms + chaos testing.
patterns: cell, bulkhead, circuit

> 🧒 **Like you're 5:** Never keep all your eggs in one basket: copies of everything in two or three buildings (AZs), so if one building loses power, the others carry on.

### ITEM aws-iac | Infrastructure as code with CloudFormation or CDK, deployed through CI/CD | bonus
ask: How do you manage infrastructure using CloudFormation or CDK and deploy it through CI/CD?
card: IaC = infrastructure defined in version-controlled code: reviewable, repeatable, no click-ops drift. CloudFormation = YAML/JSON templates → stacks with change sets and rollback. CDK = write infra in Java/TypeScript that synthesizes CloudFormation (loops, reuse, constructs). Terraform is the multi-cloud alternative. Pipeline: PR → lint/synth/plan + tests → review the diff/change set → deploy to dev → staging → prod with approvals; separate accounts per environment; never store secrets in templates.

```java
// AWS CDK in Java
Bucket invoices = Bucket.Builder.create(this, "Invoices")
    .versioned(true)
    .encryption(BucketEncryption.KMS_MANAGED)
    .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
    .build();
```
