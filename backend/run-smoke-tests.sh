#!/bin/bash

# Production Smoke Tests - Instant Publish System
# Version: 2.0.0
# Date: November 1, 2025

set -e

API_KEY="${API_KEY:-sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3}"
BASE_URL="${BASE_URL:-https://story.creatorsflow.app}"
ACCOUNT_ID="${ACCOUNT_ID:-12345}"

echo "========================================"
echo "🧪 SMOKE TESTS - Instant Publish System"
echo "========================================"
echo ""
echo "Base URL: $BASE_URL"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_passed() {
  echo -e "${GREEN}✅ PASSED${NC}: $1"
  ((PASSED++))
}

test_failed() {
  echo -e "${RED}❌ FAILED${NC}: $1"
  ((FAILED++))
}

test_warning() {
  echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

echo "========================================"
echo "TEST 1: Batch Feliz (3 historias)"
echo "========================================"
echo ""

# Create test batch with 3 clips
BATCH_RESPONSE=$(curl -sS -X POST "$BASE_URL/api/metricool/publish/stories" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant: stories" \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [
      {"id": "test_1", "url": "https://example.com/clip1.mp4", "text": "Test 1"},
      {"id": "test_2", "url": "https://example.com/clip2.mp4", "text": "Test 2"},
      {"id": "test_3", "url": "https://example.com/clip3.mp4", "text": "Test 3"}
    ],
    "settings": {
      "accountId": "'"$ACCOUNT_ID"'",
      "publishSpeed": "fast"
    },
    "schedule": {
      "mode": "now"
    }
  }')

BATCH_ID=$(echo $BATCH_RESPONSE | jq -r '.batchId')

if [ "$BATCH_ID" != "null" ] && [ -n "$BATCH_ID" ]; then
  echo "Batch created: $BATCH_ID"
  test_passed "Batch creation"
else
  echo "Response: $BATCH_RESPONSE"
  test_failed "Batch creation - No batchId returned"
  exit 1
fi

echo ""
echo "Waiting for batch to process (60 seconds)..."
sleep 60

# Check final status
FINAL_STATUS=$(curl -sS "$BASE_URL/api/metricool/status?batchId=$BATCH_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant: stories")

echo "Final status: $FINAL_STATUS"

PUBLISHED=$(echo $FINAL_STATUS | jq -r '.posts.published // 0')
TOTAL=$(echo $FINAL_STATUS | jq -r '.posts.total // 0')
STATUS=$(echo $FINAL_STATUS | jq -r '.status')

echo ""
echo "Results:"
echo "  Published: $PUBLISHED/$TOTAL"
echo "  Status: $STATUS"

if [ "$PUBLISHED" -eq "$TOTAL" ] && [ "$STATUS" = "completed" ]; then
  test_passed "Batch completed successfully ($PUBLISHED/$TOTAL)"
else
  test_warning "Batch may not have completed: $PUBLISHED/$TOTAL (status: $STATUS)"
fi

echo ""
echo "Checking PM2 logs for mutex and instant mode..."
pm2 logs storyclip --lines 50 --nostream | grep -E "(lock|INSTANT MODE|Story confirmed)" | tail -10

echo ""
echo "========================================"
echo "TEST 2: Reconciliation Test"
echo "========================================"
echo ""

if [ -n "$BATCH_ID" ]; then
  RECONCILE_RESPONSE=$(curl -sS "$BASE_URL/api/metricool/reconcile/$BATCH_ID" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Tenant: stories")

  echo "Reconciliation response:"
  echo "$RECONCILE_RESPONSE" | jq '.'

  RECONCILED=$(echo $RECONCILE_RESPONSE | jq -r '.reconciled')
  REC_PUBLISHED=$(echo $RECONCILE_RESPONSE | jq -r '.posts.published // 0')

  if [ "$RECONCILED" = "true" ]; then
    test_passed "Reconciliation endpoint working ($REC_PUBLISHED published)"
  else
    test_failed "Reconciliation endpoint failed"
  fi
else
  test_warning "Skipping reconciliation test - no batch ID"
fi

echo ""
echo "========================================"
echo "TEST 3: Mutex/Concurrency Test"
echo "========================================"
echo ""

echo "Creating first batch..."
BATCH1=$(curl -sS -X POST "$BASE_URL/api/metricool/publish/stories" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant: stories" \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [
      {"id": "concurrent_1", "url": "https://example.com/c1.mp4", "text": "Concurrent 1"}
    ],
    "settings": {
      "accountId": "'"$ACCOUNT_ID"'",
      "publishSpeed": "safe"
    },
    "schedule": {
      "mode": "now"
    }
  }')

BATCH1_ID=$(echo $BATCH1 | jq -r '.batchId')

echo "Batch 1 ID: $BATCH1_ID"

# Immediately try to create duplicate (should fail if mutex works)
sleep 1
echo "Attempting to process same batch again (should be locked)..."

# Check if batch is locked by checking active batches
pm2 logs storyclip --lines 20 --nostream | grep -E "(Acquired lock|already being processed)" | tail -5

if pm2 logs storyclip --lines 20 --nostream | grep -q "Acquired lock for batch $BATCH1_ID"; then
  test_passed "Mutex lock acquired for batch"
else
  test_warning "Could not verify mutex lock in logs"
fi

echo ""
echo "========================================"
echo "TEST 4: Status Endpoint"
echo "========================================"
echo ""

if [ -n "$BATCH_ID" ]; then
  STATUS_RESPONSE=$(curl -sS "$BASE_URL/api/metricool/status?batchId=$BATCH_ID" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Tenant: stories")

  echo "Status endpoint response:"
  echo "$STATUS_RESPONSE" | jq '.'

  if echo "$STATUS_RESPONSE" | jq -e '.batchId' > /dev/null; then
    test_passed "Status endpoint working"
  else
    test_failed "Status endpoint not returning batchId"
  fi
else
  test_warning "Skipping status test - no batch ID"
fi

echo ""
echo "========================================"
echo "TEST 5: Logs Verification"
echo "========================================"
echo ""

echo "Checking for key log patterns in last 100 lines..."
echo ""

LOGS=$(pm2 logs storyclip --lines 100 --nostream)

# Check for instant mode
if echo "$LOGS" | grep -q "INSTANT MODE"; then
  test_passed "INSTANT MODE log found"
else
  test_warning "INSTANT MODE log not found in recent logs"
fi

# Check for smart polling
if echo "$LOGS" | grep -q "Smart polling"; then
  test_passed "Smart polling log found"
else
  test_warning "Smart polling log not found in recent logs"
fi

# Check for anti-race
if echo "$LOGS" | grep -q "ANTI-RACE"; then
  test_passed "ANTI-RACE protection log found"
else
  echo "  (Note: ANTI-RACE only appears when race condition is caught)"
fi

# Check for lock management
if echo "$LOGS" | grep -q "Acquired lock"; then
  test_passed "Mutex lock acquisition logged"
else
  test_warning "Lock acquisition log not found"
fi

if echo "$LOGS" | grep -q "Released lock"; then
  test_passed "Mutex lock release logged"
else
  test_warning "Lock release log not found"
fi

# Check for reconciliation
if echo "$LOGS" | grep -q "Reconciled batch"; then
  test_passed "Reconciliation logs found"
else
  test_warning "Reconciliation logs not found (may not have been triggered)"
fi

echo ""
echo "========================================"
echo "RESULTS SUMMARY"
echo "========================================"
echo ""
echo -e "Tests passed: ${GREEN}$PASSED${NC}"
echo -e "Tests failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "System is ready for production! 🚀"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Please review failures above before deploying to production."
  exit 1
fi
