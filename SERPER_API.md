# Serper API Integration Plan

This document outlines the plan for implementing a dedicated Serper API endpoint for retrieving object information in the Appraisers application.

## Current Implementation

The Serper API is currently integrated in the backend at:
- `/appraisers-backend/services/serper.js`

The implementation allows searching for information about art objects to enrich appraisal reports. However, it lacks a dedicated endpoint for frontend access and has no caching mechanism to reduce API costs.

## Implementation Plan

### 1. Create Dedicated Endpoint

Add a new endpoint to the backend API:

```
GET /api/search/object?query={search_term}
```

This endpoint will:
- Accept a search query parameter
- Validate and sanitize the input
- Rate limit requests to prevent abuse
- Implement caching to reduce API costs
- Return structured results suitable for the frontend

### 2. Middleware Requirements

Create the necessary middleware components:

1. **Rate Limiting Middleware**:
   - Limit requests per IP to prevent abuse
   - Apply user-based quotas for authenticated users

2. **Caching Middleware**:
   - Implement memory cache with TTL (Time To Live)
   - Consider persistent caching for common queries

3. **Authentication Middleware**:
   - Require valid JWT for access
   - Track and attribute usage to specific users

### 3. Service Enhancement

Enhance the existing Serper API service:

1. **Result Processing**:
   - Extract and normalize key information
   - Filter out irrelevant results
   - Add relevance scoring
   - Enhance with additional metadata when available

2. **Error Handling**:
   - Implement retry logic for transient errors
   - Circuit breaker for API outages
   - Fallback mechanism when API is unavailable

3. **Logging & Monitoring**:
   - Track usage statistics
   - Monitor API quotas and costs
   - Alert on high usage or errors

### 4. Frontend Integration

Implement frontend components:

1. **Search Component**:
   - Create a reusable object search component
   - Add type-ahead suggestions
   - Implement search history

2. **Results Display**:
   - Create a dedicated results view
   - Include images, descriptions, and provenance
   - Allow selecting results for inclusion in appraisals

3. **Offline Support**:
   - Cache recent searches in browser storage
   - Allow working with previously fetched data when offline

### 5. Implementation Timeline

| Phase | Description | Timeline |
|-------|-------------|----------|
| 1 | Backend Endpoint & Base Service | Week 1 |
| 2 | Caching & Rate Limiting | Week 1 |
| 3 | Result Processing & Error Handling | Week 2 |
| 4 | Frontend Components | Week 2 |
| 5 | Testing & Refinement | Week 3 |

## Technical Specifications

### API Request Format

```
GET /api/search/object?query=Picasso%20Guernica
```

Optional parameters:
```
limit=10           # Number of results (default: 5)
source=google,bing # Data sources to use (default: all)
detailed=true      # Include full details (default: false)
```

### API Response Format

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "Guernica",
        "artist": "Pablo Picasso",
        "year": "1937",
        "medium": "Oil on canvas",
        "dimensions": "349.3 cm × 776.6 cm",
        "location": "Museo Reina Sofía, Madrid",
        "description": "...",
        "images": ["url1", "url2"],
        "sources": [
          {
            "title": "Source title",
            "url": "Source URL",
            "snippet": "Relevant text..."
          }
        ]
      }
    ],
    "meta": {
      "query": "Picasso Guernica",
      "totalResults": 42,
      "executionTime": "0.54s",
      "cached": true,
      "source": "serper"
    }
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

## Security Considerations

1. **API Key Protection**:
   - Store Serper API key in Google Secret Manager
   - Never expose the key to clients

2. **Input Validation**:
   - Sanitize all user input
   - Validate query parameters
   - Prevent injection attacks

3. **Rate Limiting**:
   - Implement per-user and per-IP rate limits
   - Use token bucket algorithm for bursts

4. **Data Privacy**:
   - Do not store personally identifiable information in logs
   - Clear cached results after appropriate TTL

## Success Metrics

- Successfully retrieve relevant information for >90% of object queries
- Maintain response time under 1 second for 95% of requests
- Achieve cache hit rate of >50% to reduce API costs
- Frontend component usage in at least 30% of appraisals

This implementation will significantly improve the appraisal process by providing easy access to contextual information about art objects directly within the application workflow.