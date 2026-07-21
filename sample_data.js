/**
 * Initial Sample Data & Blueprint Templates for PRD Editor / AI Architect
 */

window.DEFAULT_PROJECTS = [
  {
    id: "proj-bank-001",
    name: "bank",
    prompt: "aku pengen bikin web buat bank yang bisa tranfer, nerima duit, dan lain sebagainya kayak perbankan pada umumnya",
    date: "20/7/2026",
    category: "Perbankan & Keuangan",
    versions: {
      "v1": {
        "PRD.md": `# Product Requirements Document (PRD) - Web Banking Platform

## 1. Visi & Tujuan Produk
Platform perbankan digital berbasis web yang modern, aman, dan responsif. Sistem ini dirancang untuk memberikan kemudahan bagi nasabah dalam melakukan transaksi keuangan sehari-hari, transfer antar rekening, penerimaan dana, manajemen kartu, serta pemantauan riwayat transaksi secara real-time.

## 2. Target Persona Pengguna
* **Nasabah Ritel (End User)**: Membutuhkan akses cepat untuk cek saldo, kirim/terima uang, dan melihat mutasi rekening dari desktop maupun mobile.
* **Administrator Bank**: Mengelola verifikasi identitas nasabah, pemantauan transaksi terindikasi mencurigakan (Fraud Detection), dan administrasi limit.
* **Customer Support**: Membantu penyelesaian kendala transaksi nasabah dan pembekuan kartu darurat.

## 3. Fitur Utama
* **Autentikasi & Keamanan Tingkat Tinggi**: Multi-Factor Authentication (MFA), PIN transaksi 6 digit, dan Enkripsi End-to-End.
* **Transfer Dana**: Transfer sesama bank & antar bank real-time (BI-FAST API), dengan fitur penjadwalan & favorit.
* **Penerimaan Uang (Virtual Account & QRIS)**: Penjanaan kode QRIS dinamis dan nomor Virtual Account per nasabah.
* **Manajemen Rekening & Kartu**: Buka tabungan tambahan, blokir kartu debit sementara, dan ubah limit transaksi harian.
* **Laporan & Mutasi E-Statement**: Unduh laporan keuangan bulanan dalam format PDF dan spreadsheet.

## 4. Metrik Kesuksesan (KPI)
* Uptime sistem 99.99% tanpa downtime yang tidak terencana.
* Latensi pemrosesan transfer dana < 1.5 detik.
* Tingkat penyelesaian transaksi sukses > 99.2%.

## 5. Batasan Ruang Lingkup (Scope Boundaries)
* **In Scope**: Web Portal Nasabah, Dashboard Admin, API Gateway Integration, Notifikasi Email/WhatsApp.
* **Out of Scope (Fase 1)**: Integrasi pinjaman kredit secara penuh dan investasi saham langsung.`,

        "TECH_STACK.md": `# Rekomendasi Tech Stack - Web Banking Platform

## 1. Frontend Layer
* **Framework**: React.js / Next.js (App Router) untuk Server-Side Rendering (SSR) & SEO optimized landing page.
* **Styling**: Tailwind CSS + Shadcn UI untuk antarmuka yang modern, responsif, dan accessible.
* **State Management**: Zustand / Redux Toolkit untuk mengelola state autentikasi dan keranjang transaksi.
* **Icons & Animation**: Lucide React + Framer Motion.

## 2. Backend Layer
* **Core API**: Go (Golang) / Node.js (TypeScript) dengan NestJS untuk performa tinggi & concurrency handling.
* **API Architecture**: RESTful API + gRPC untuk komunikasi antar mikroservis internal secara ultra-fast.
* **Message Broker**: Apache Kafka / RabbitMQ untuk mengolah event transaksi asynchronous dan notifikasi real-time.

## 3. Database & Caching
* **Relational Database**: PostgreSQL (Primary DB dengan Read Replicas & Connection Pooling).
* **In-Memory Cache**: Redis (Caching session token, rate limiting, dan temporary OTP).

## 4. Security & Infrastructure
* **Identity & Access**: OAuth 2.0 + OpenID Connect (OIDC) & HashiCorp Vault untuk secrets management.
* **Containerization**: Docker & Kubernetes (K8s) untuk orchestrating mikroservis.
* **Cloud Provider**: AWS (EC2, RDS PostgreSQL, ElastiCache, S3) / Cloudflare Enterprise (WAF & DDoS Protection).`,

        "ARCHITECTURE.md": `# Arsitektur Sistem (High-Level Design) - Bank WebApp

## 1. Komponen Utama
Sistem menggunakan pendekatan **Microservices Architecture** berbasis event-driven untuk menjamin keandalan dan skalabilitas.

\`\`\`mermaid
graph TD
    Client[Web Client / Mobile Browser] --> WAF[Cloudflare WAF / DDoS Protection]
    WAF --> Gateway[API Gateway - Kong / Envoy]
    
    Gateway --> AuthSvc[Auth & Identity Service]
    Gateway --> AccSvc[Account & Profile Service]
    Gateway --> TxnSvc[Transaction & Transfer Engine]
    Gateway --> NotificationSvc[Notification Service]
    
    TxnSvc --> EventBus[(Kafka Event Bus)]
    EventBus --> LedgerSvc[Core Ledger Service]
    EventBus --> FraudSvc[Fraud Detection Engine]
    EventBus --> NotificationSvc
    
    AuthSvc --> Redis[(Redis Session Cache)]
    AccSvc --> MainDB[(PostgreSQL Primary)]
    LedgerSvc --> MainDB
\`\`\`

## 2. Alur Transaksi Transfer Dana
1. Client mengirim permintaan transaksi terenkripsi melalui API Gateway.
2. API Gateway memvalidasi JWT Token dan meneruskan ke **Transaction Engine**.
3. **Transaction Engine** memeriksa saldo nasabah dan mendaftarkan pemesanan dana (hold balance).
4. Pesan dikirim ke **Kafka Event Bus** untuk mengeksekusi jurnal pemindahbukuan (*double-entry bookkeeping*) pada **Core Ledger Service**.
5. Setelah sukses, notifikasi otomatis dikirimkan ke penerima & pengirim via WebSocket / WhatsApp API.`,

        "DATABASE.md": `# Skema Database & Relasi Entitas - Bank WebApp

## 1. Struktur Koleksi & Tabel (29 Collections / Tables)
Tabel utama mencakup: \`customers\`, \`customer_profiles\`, \`accounts\`, \`account_balances\`, \`transactions\`, \`ledger_entries\`, \`cards\`, \`devices\`, \`auth_tokens\`, \`audit_logs\`, \`limit_profiles\`, \`statements\`, \`notifications\`, dll.

## 2. Visual Diagram Relasi Entitas (ERD)

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ CUSTOMER_PROFILE : has
    CUSTOMER ||--o{ ACCOUNT : owns
    CUSTOMER ||--o{ DEVICE : registers
    CUSTOMER ||--o{ AUTH_TOKEN : issues
    ACCOUNT ||--o{ ACCOUNT_BALANCE : tracks
    ACCOUNT ||--o{ TRANSACTION : initiates
    ACCOUNT ||--o{ CARD : issues
    TRANSACTION ||--|{ LEDGER_ENTRY : produces
    TRANSACTION ||--o{ TRANSACTION_LOG : logs
    CUSTOMER ||--o{ AUDIT_LOG : generates

    CUSTOMER {
        string id PK
        string email UK
        string phone UK
        string status
        datetime created_at
    }

    CUSTOMER_PROFILE {
        string id PK
        string customer_id FK
        string full_name
        string nik_ktp
        date birth_date
        string address
    }

    ACCOUNT {
        string account_number PK
        string customer_id FK
        string account_type
        string currency
        string status
    }

    ACCOUNT_BALANCE {
        string id PK
        string account_number FK
        decimal current_balance
        decimal available_balance
        datetime updated_at
    }

    TRANSACTION {
        string transaction_id PK
        string source_account FK
        string target_account
        decimal amount
        string category
        string status
        datetime created_at
    }

    LEDGER_ENTRY {
        string entry_id PK
        string transaction_id FK
        string account_number FK
        string entry_type
        decimal amount
    }

    CARD {
        string card_number PK
        string account_number FK
        string card_type
        string status
        date expiry_date
    }
\`\`\`

## 3. Aturan Integritas Data
* **Double-Entry Bookkeeping**: Setiap transaksi *Wajib* menghasilkan minimal dua catatan \`LEDGER_ENTRY\` (satu Debit dan satu Kredit) dengan nilai seimbang.
* **ACID Transactions**: Seluruh mutasi rekening menggunakan transaksi database relasional berlapis dengan isolasi \`REPEATABLE READ\`.`,

        "API.md": `# Dokumentasi API Contracts - Bank WebApp

## 1. Base URL & Versioning
\`\`\`text
Production: https://api.bankweb.com/v1
Staging:    https://api-staging.bankweb.com/v1
\`\`\`

## 2. Authentication Headers
\`\`\`http
Authorization: Bearer <JWT_ACCESS_TOKEN>
X-Signature: <HMAC_SHA256_SIGNATURE>
X-Request-Timestamp: 2026-07-20T21:00:00Z
\`\`\`

## 3. Endpoints Utama

### A. Autentikasi Nasabah
* **POST** \`/auth/login\`
  * **Payload Request**:
    \`\`\`json
    {
      "username": "nasabah_hebat",
      "password": "SecretPassword123!",
      "device_id": "dev-ios-9821"
    }
    \`\`\`
  * **Response (200 OK)**:
    \`\`\`json
    {
      "status": "success",
      "data": {
        "access_token": "eyJhbGciOi...",
        "expires_in": 3600,
        "token_type": "Bearer"
      }
    }
    \`\`\`

### B. Transfer Dana Intrabank
* **POST** \`/transfers/intrabank\`
  * **Payload Request**:
    \`\`\`json
    {
      "source_account": "1098234711",
      "target_account": "1098554900",
      "amount": 500000.00,
      "notes": "Bayar tagihan proyek",
      "pin": "123456"
    }
    \`\`\`
  * **Response (200 OK)**:
    \`\`\`json
    {
      "status": "success",
      "transaction_id": "TXN-20260720-99812",
      "timestamp": "2026-07-20T21:05:00Z",
      "remaining_balance": 4500000.00
    }
    \`\`\``,

        "DEPLOYMENT.md": `# Deployment & Infrastructure Guide - Bank WebApp

## 1. Ringkasan Deployment Strategy
Sistem dikembangkan menggunakan konsep **Infrastructure as Code (IaC)** dengan Terraform & Helm Charts pada cluster Kubernetes (EKS/GKE).

## 2. Prasyarat Lingkungan (Environment Prerequisites)
* Docker v24.0+
* Kubernetes Cluster (v1.28+)
* PostgreSQL Managed Instance (AWS RDS PostgreSQL 15+)
* Redis Cluster (ElastiCache v7+)

## 3. Variabel Lingkungan (.env)
\`\`\`env
NODE_ENV=production
PORT=8080
DB_HOST=rds-postgres-bank.internal
DB_PORT=5432
DB_NAME=bank_production
DB_USER=app_dbuser
DB_PASSWORD={{SECRET_VAULT_DB_PASS}}
REDIS_URL=redis://elasticache-cluster:6379
KAFKA_BROKERS=kafka-1:9092,kafka-2:9092
JWT_SECRET={{SECRET_VAULT_JWT_KEY}}
\`\`\`

## 4. Pipeline CI/CD (GitHub Actions Example)
\`\`\`yaml
name: Deploy Bank WebApp Services

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Build Docker Image
        run: |
          docker build -t bank-app-api:\${{ github.sha }} .

      - name: Run Security Audit & Tests
        run: |
          docker run bank-app-api:\${{ github.sha }} npm test

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/bank-api-service bank-api=bank-app-api:\${{ github.sha }}
\`\`\``
      }
    }
  }
];

window.DOCUMENT_TYPES = [
  { key: "PRD.md", label: "Product Requirements (PRD)", icon: "file-text", description: "Dokumen lengkap yang mendefinisikan persona pengguna, fitur utama, metrik kesuksesan, dan batas ruang lingkup (scope) proyek." },
  { key: "TECH_STACK.md", label: "Tech Stack", icon: "code", description: "Rekomendasi kerangka kerja (framework), bahasa pemrograman, dan infrastruktur paling ideal berdasarkan kebutuhan skalabilitas ide Anda." },
  { key: "ARCHITECTURE.md", label: "System Architecture", icon: "box", description: "Panduan arsitektur sistem tingkat tinggi (High-Level Design) yang menjelaskan bagaimana setiap komponen dan servis saling berkomunikasi." },
  { key: "DATABASE.md", label: "Database Schema", icon: "database", description: "Rancangan struktur tabel relasional (SQL) atau dokumen (NoSQL) yang dinormalisasi untuk menyimpan entitas bisnis Anda." },
  { key: "API.md", label: "API Contracts", icon: "globe", description: "Dokumentasi spesifikasi endpoint REST API lengkap dengan metode, parameter, payload JSON, dan struktur respons yang diharapkan." },
  { key: "DEPLOYMENT.md", label: "Deployment Guide", icon: "rocket", description: "Panduan langkah-demi-langkah untuk melakukan deployment aplikasi ke cloud (Vercel, AWS, dll) lengkap dengan script CI/CD." }
];
