# Pokémon Environmental Design Encyclopedia
# Volume XXV — FireRed Design Database
**Edition 1.0**

## Purpose

Volume XXV is an executable companion to the first twenty-four volumes. It defines a source-grounded pipeline for converting a local FireRed decompilation into a design-analysis corpus.

## Core principle

No measurement is invented.

Every value is either:

- extracted,
- computed,
- annotated,
- or explicitly unknown.

## Database layers

1. Source provenance
2. Map inventory
3. Tile geometry
4. Collision semantics
5. Navigation graph
6. Events and landmarks
7. Camera screens
8. Metrics
9. Rule audits
10. Case studies

## Initial deliverable

The starter project contains:

- JSON schemas,
- normalized record formats,
- rule and pattern registries,
- repository-scanning utilities,
- screen-segmentation utilities,
- validation tools,
- case-study generation,
- annotation standards,
- an implementation roadmap.

## Evidence standard

Derived claims must retain a path back to:

- repository commit,
- source file,
- map coordinate,
- calculation method,
- reviewer annotation.

## End state

The completed system should support a query such as:

> Show all early-game outdoor screens with a three-tile median path width, one dominant landmark, low grid exposure, and a compression-to-release transition.

The response should be generated from recorded evidence rather than descriptive memory.
