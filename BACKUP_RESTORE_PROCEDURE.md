# FeraSetu Backup and Disaster Recovery Procedure

## Overview
This document describes the backup and disaster recovery procedures for FeraSetu production environments.

## Backup Strategy

### 1. Database Backups

#### Cloudflare D1 (Primary)
- **Frequency**: Automated daily snapshots (managed by Cloudflare)
- **Retention**: 7 days (configurable)
- **Point-in-time recovery**: Available via Cloudflare dashboard
- **Manual backup**: `wrangler d1 export fera-shopkeeper --output=backup_$(date +%Y%m%d).sql`

#### SQLite (Development/Fallback)
- **Location**: `./data/fera_shopkeeper.db`
- **Frequency**: Before each deployment + daily cron
- **Command**: `cp ./data/fera_shopkeeper.db ./backups/fera_shopkeeper_$(date +%Y%m%d_%H%M%S).db`

#### MySQL (Production Alternative)
- **Frequency**: Daily at 02:00 UTC
- **Tool**: `mysqldump --single-transaction --routines --triggers`
- **Retention**: 30 days
- **Location**: S3/GCS bucket with encryption

### 2. File Storage Backups
- **Uploads directory**: `/uploads`
- **Frequency**: Daily sync to S3/GCS
- **Command**: `aws s3 sync ./uploads s3://ferasetu-backups/uploads/ --delete`

### 3. Configuration Backups
- **Environment files**: `.env.production`, `wrangler.toml`
- **Frequency**: On every change
- **Storage**: Git repository (encrypted secrets in Cloudflare/HashiCorp Vault)

## Recovery Procedures

### 1. Point-in-Time Recovery (D1)
```bash
# 1. Identify target timestamp
# 2. Use Cloudflare dashboard → D1 → Backups → Restore
# 3. Or use wrangler:
wrangler d1 restore fera-shopkeeper --backup-id=<backup-id>
```

### 2. Full Database Restore (SQLite)
```bash
# 1. Stop application
# 2. Restore database file
cp ./backups/fera_shopkeeper_20240115_020000.db ./data/fera_shopkeeper.db
# 3. Start application
```

### 3. Full Database Restore (MySQL)
```bash
# 1. Create new database
mysql -u root -p -e "CREATE DATABASE fera_shopkeeper_restore;"
# 2. Restore from dump
gunzip -c backups/fera_shopkeeper_20240115.sql.gz | mysql -u root -p fera_shopkeeper_restore
# 3. Verify data integrity
# 4. Swap database (update .env or rename)
```

### 4. File Storage Restore
```bash
aws s3 sync s3://ferasetu-backups/uploads/ ./uploads/ --delete
```

## Testing Schedule

| Test Type | Frequency | Responsible |
|-----------|-----------|-------------|
| Backup verification (checksum) | Daily | Automated |
| Restore test (staging) | Weekly | DevOps |
| Full DR drill | Quarterly | Team |
| Cross-region restore test | Semi-annually | DevOps |

## RTO/RPO Targets

| Component | RPO | RTO |
|-----------|-----|-----|
| Database (D1) | 1 hour | 30 minutes |
| Database (MySQL) | 1 hour | 1 hour |
| File storage | 24 hours | 2 hours |
| Configuration | 0 | 15 minutes |

## Escalation Contacts

| Severity | Contact | Channel |
|----------|---------|---------|
| Critical (data loss) | CTO, Lead DevOps | Phone + Slack |
| High (extended downtime) | Lead DevOps, Engineering Lead | Slack + Phone |
| Medium | DevOps on-call | Slack |

## Verification Checklist

Post-restore verification:
- [ ] Database connectivity
- [ ] User authentication works
- [ ] API endpoints respond correctly
- [ ] File uploads accessible
- [ ] Email sending works
- [ ] Admin panel accessible
- [ ] Data integrity checks pass (row counts, foreign keys)
- [ ] Monitoring alerts clear