# Cloud Functions

## Deploying

```
FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only functions
```

The discovery server that reads the function manifest defaults to a ten
second budget. On a slower machine it regularly exceeds that and fails with
"Cannot determine backend specification", even though the code itself loads
in well under a second. Raising the budget is the supported fix.

## Report PDFs

generateReportPdf renders with PDFKit and returns the bytes base64 encoded
in the response, rather than writing to Cloud Storage. A report is around
52KB, roughly 70KB encoded, against a 10MB callable limit. Returning it
directly avoids a bucket, its egress and a second set of permissions, and
means an amended report can never be served from a stale saved copy.

The MARTI logo lives in `assets/` so rendering never depends on a network
fetch. That folder must ship with the deploy.
