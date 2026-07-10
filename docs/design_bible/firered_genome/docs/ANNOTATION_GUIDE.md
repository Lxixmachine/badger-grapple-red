# Annotation Guide

Use three evidence classes:

- `observed`: directly present in source data or rendered output.
- `measured`: computed reproducibly from source data.
- `interpreted`: design inference requiring human judgment.

Every annotation should include:

```yaml
value:
evidence_class:
source:
confidence:
reviewer:
notes:
```

Never convert an interpretation into a measurement.

Unknown values remain null.
