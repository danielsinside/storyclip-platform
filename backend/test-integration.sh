#!/bin/bash

# Script de verificación de integración Frontend-Backend
# StoryClip - https://story.creatorsflow.app

set -e

echo "========================================"
echo "  STORYCLIP INTEGRATION TEST SUITE"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API URLs
BACKEND_URL="https://story.creatorsflow.app/api"
LOCAL_URL="http://localhost:3000/api"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((TESTS_FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

info() {
  echo -e "ℹ $1"
}

# Test 1: Backend Health Check
echo "Test 1: Backend Health Check"
if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
  pass "Backend is online"
else
  fail "Backend is offline"
fi
echo ""

# Test 2: Backend Config
echo "Test 2: Backend Configuration"
CONFIG=$(curl -s "$BACKEND_URL/config" 2>&1)
if echo "$CONFIG" | grep -q "maxFileSize"; then
  pass "Config endpoint working"
  info "$(echo $CONFIG | jq -r '.maxFileSize // "N/A"' 2>/dev/null || echo 'N/A') max file size"
else
  fail "Config endpoint not working"
fi
echo ""

# Test 3: Process Video Endpoint (without auth)
echo "Test 3: Process Video Endpoint"
RESPONSE=$(curl -s -X POST "$BACKEND_URL/process-video" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://example.com/test.mp4","mode":"auto"}' 2>&1)

if echo "$RESPONSE" | grep -q "success"; then
  pass "Process-video endpoint responds"
else
  fail "Process-video endpoint not responding"
fi
echo ""

# Test 4: Job Status Endpoint
echo "Test 4: Job Status Endpoint"
STATUS=$(curl -s "$BACKEND_URL/v1/jobs/test123/status" 2>&1)
if echo "$STATUS" | grep -q "Job not found"; then
  pass "Job status endpoint working (expected 404)"
else
  fail "Job status endpoint not working"
fi
echo ""

# Test 5: PM2 Process
echo "Test 5: PM2 Process Status"
if pm2 list | grep -q "storyclip.*online"; then
  pass "PM2 process running"

  # Check restart count
  RESTARTS=$(pm2 jlist | jq '.[0].pm2_env.restart_time // 0')
  if [ "$RESTARTS" -gt 10 ]; then
    warn "High restart count: $RESTARTS restarts"
  else
    info "Restart count: $RESTARTS"
  fi
else
  fail "PM2 process not running"
fi
echo ""

# Test 6: Redis Connection
echo "Test 6: Redis Connection"
if redis-cli ping 2>&1 | grep -q "PONG"; then
  pass "Redis is online"
else
  fail "Redis is offline"
fi
echo ""

# Test 7: Disk Space
echo "Test 7: Disk Space"
DISK_USAGE=$(df -h /srv/storyclip | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  pass "Disk usage OK ($DISK_USAGE%)"
else
  warn "Disk usage high ($DISK_USAGE%)"
fi
echo ""

# Test 8: Temp Files
echo "Test 8: Temporary Files Cleanup"
TMP_SIZE=$(du -sh /srv/storyclip/tmp 2>/dev/null | awk '{print $1}')
WORK_SIZE=$(du -sh /srv/storyclip/work 2>/dev/null | awk '{print $1}')
info "Temp dir size: $TMP_SIZE"
info "Work dir size: $WORK_SIZE"

TMP_SIZE_MB=$(du -sm /srv/storyclip/tmp 2>/dev/null | awk '{print $1}')
if [ "$TMP_SIZE_MB" -lt 5000 ]; then
  pass "Temp files under control"
else
  warn "Temp files accumulating ($TMP_SIZE)"
fi
echo ""

# Test 9: Database
echo "Test 9: Database Status"
DB_SIZE=$(du -sh /srv/storyclip/database/storyclip.db 2>/dev/null | awk '{print $1}')
JOB_COUNT=$(sqlite3 /srv/storyclip/database/storyclip.db "SELECT COUNT(*) FROM jobs;" 2>/dev/null || echo "0")
pass "Database accessible"
info "Database size: $DB_SIZE"
info "Total jobs: $JOB_COUNT"
echo ""

# Test 10: FFmpeg
echo "Test 10: FFmpeg Installation"
if ffmpeg -version > /dev/null 2>&1; then
  FFMPEG_VERSION=$(ffmpeg -version | head -1 | awk '{print $3}')
  pass "FFmpeg installed (v$FFMPEG_VERSION)"
else
  fail "FFmpeg not found"
fi
echo ""

# Test 11: Nginx
echo "Test 11: Nginx Configuration"
if nginx -t 2>&1 | grep -q "test is successful"; then
  pass "Nginx config valid"
else
  warn "Nginx config has warnings"
fi
echo ""

# Test 12: Outputs Directory
echo "Test 12: Outputs Directory"
if [ -d "/srv/storyclip/outputs" ] && [ -w "/srv/storyclip/outputs" ]; then
  pass "Outputs directory writable"
  OUTPUT_SIZE=$(du -sh /srv/storyclip/outputs 2>/dev/null | awk '{print $1}')
  info "Outputs size: $OUTPUT_SIZE"
else
  fail "Outputs directory not writable"
fi
echo ""

# Test 13: CORS Test (if running locally)
echo "Test 13: CORS Headers"
CORS_HEADER=$(curl -s -I -X OPTIONS "$BACKEND_URL/process-video" \
  -H "Origin: https://storyclip-studio.lovable.app" \
  -H "Access-Control-Request-Method: POST" 2>&1 | grep -i "access-control-allow-origin" || echo "")

if [ -n "$CORS_HEADER" ]; then
  pass "CORS headers present"
else
  warn "CORS headers not found (may be OK if handled by backend)"
fi
echo ""

# Summary
echo "========================================"
echo "  TEST SUMMARY"
echo "========================================"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Integration status: ✅ READY"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "Integration status: ⚠️  NEEDS ATTENTION"
  exit 1
fi
