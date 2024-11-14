#!/bin/bash

# Variables
JWT_TOKEN="your_jwt_token"
API_URL="https://appraisers-backend-856401495068.us-central1.run.app"

# Test client endpoint
curl -X POST \
  "${API_URL}/api/appraisals/41/complete-process" \
  -H "Content-Type: application/json" \
  -H "Cookie: jwtToken=${JWT_TOKEN}" \
  -d '{
    "appraisalValue": 1900,
    "description": "a Fine Quality Landscape Scene by listed Artist Hans Deuss (born Amsterdam, 1948) is a Dutch realist painter. Hans Deuss graduated from the Graphics training at the Gerrit Rietveld Academie in Amsterdam. Material: oil paint on panel\nSize: 16 x 48 cm painting only\nSize: 27 x 68 cm incl frame\nsigned and dated 1998"
  }'