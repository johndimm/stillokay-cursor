#!/bin/bash

DELAY_HOURS=0
  
CRON_SECRET="qyiwi+drj82lUdL+nozsSPItUgJFQm95N9VuxMWx2Jc="
# SERVER_URL="https://stillokay-cursor.vercel.app"
SERVER_URL="http://localhost:3000"
URL="${SERVER_URL}/api/cron-checkin?delayHours=${DELAY_HOURS}" 

echo $URL

curl -X POST ${URL} \
  -H "Authorization: Bearer $CRON_SECRET"  | python3 -m json.tool >> check-missed-checkins.log

