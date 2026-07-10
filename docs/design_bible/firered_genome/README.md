# FireRed Design Database

A companion project for the **Pokémon Environmental Design Bible**.

This project converts map data from a local `pret/pokefirered` decompilation into a normalized design-analysis database. It does **not** include a ROM, Nintendo assets, extracted graphics, or copyrighted game data.

## Purpose

The database is designed to support:

- map inventory,
- map and screen metadata,
- navigation graphs,
- landmark records,
- pattern tagging,
- quantitative measurements,
- rule-based audits,
- AI-assisted reconstruction studies.

## Legal and technical boundary

Use a locally configured `pret/pokefirered` source tree that you are legally entitled to use. The database repository stores only derived measurements, annotations, schemas, and analysis unless you explicitly choose otherwise.

## Quick start

```bash
python3 scripts/scan_decomp.py /path/to/pokefirered
python3 scripts/build_database.py output/raw_inventory.json
python3 scripts/validate_database.py
```

Generated records are written under `data/maps/`.

## Project structure

```text
firered_design_database/
├── README.md
├── pyproject.toml
├── schemas/
│   ├── map.schema.json
│   ├── screen.schema.json
│   ├── landmark.schema.json
│   ├── audit.schema.json
│   └── rule.schema.json
├── rules/
│   └── core_rules.yaml
├── patterns/
│   └── core_patterns.yaml
├── metrics/
│   └── metric_definitions.yaml
├── scripts/
│   ├── scan_decomp.py
│   ├── build_database.py
│   ├── validate_database.py
│   ├── split_screens.py
│   └── make_case_study.py
├── data/
│   ├── maps/
│   ├── screens/
│   ├── landmarks/
│   └── audits/
└── examples/
    └── pallet_town.annotation.yaml
```

## Pipeline

```text
Local pokefirered decomp
        ↓
Repository inventory
        ↓
Normalized map records
        ↓
Screen segmentation
        ↓
Human annotation
        ↓
Metric calculation
        ↓
Rule audit
        ↓
Markdown case study
```

## Current capabilities

The starter extractor:

- finds map directories,
- inventories JSON, binary, script, event, and connection files,
- reads map JSON when available,
- extracts dimensions and declared connections where represented in JSON,
- records provenance,
- creates normalized map records,
- segments maps into configurable camera windows,
- validates records against lightweight schema checks,
- generates case-study Markdown templates.

## Deliberate limitations

This starter does not claim to infer semantic collision, path hierarchy, visual landmarks, or environmental storytelling automatically. Those require metatile interpretation, rendered-map analysis, or human annotation. Unknown values remain explicitly null rather than being guessed.

## Release 0.2 proof case

See `docs/Volume_XXVI_Pallet_Town_Source_Grounded_Extraction.md` and `data/maps/pallet_town.json`.


## Release 0.3 — Byte-safe Genome Decoder

Run:

```bash
python3 scripts/download_public_source.py
python3 scripts/decode_pallet_town.py
python3 tests/test_decoder.py
```

The decoder rejects incorrect byte lengths and SHA-1 hashes. This prevents connector corruption or accidental source mismatch from entering the dataset.


## Release 0.4 — Semantic collision and navigation

```bash
python3 scripts/download_public_source.py
python3 scripts/decode_pallet_town.py
python3 scripts/build_semantic_navigation.py
python3 tests/test_semantic_navigation.py
```

The default behavior policy is empty by design. Unknown behavior IDs remain unknown until reviewed.
