#!/usr/bin/env python3
"""Generate TypeScript interfaces from Pydantic schemas.

This is the single source of truth for the API contract.  Run this script
whenever the Pydantic schemas in ``schemas/`` change, and commit the resulting
``generated-api-types.ts`` file.

Usage::

    uv run python scripts/generate_types.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure project root is on the import path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas.bracket import BracketResponseSchema  # noqa: E402
from schemas.game import (  # noqa: E402
    GameSchema,
    GameSummarySchema,
    OddsSchema,
    ScheduleResponseSchema,
    TeamSchema,
)

# ── JSON-Schema → TypeScript type mapping ────────────────────────────────

_TS_TYPE_MAP = {
    "string": "string",
    "integer": "number",
    "number": "number",
    "boolean": "boolean",
    "object": "Record<string, unknown>",
    "array": "unknown[]",
}


def _resolve_ref(ref: str, defs: dict) -> dict:
    """Resolve a JSON-Schema ``$ref`` pointer."""
    name = ref.rsplit("/", 1)[-1]
    return defs[name]


def _ts_type(prop: dict, required: bool, defs: dict) -> str:
    """Convert a JSON-Schema property to a TypeScript type string."""
    # Handle anyOf (Pydantic uses this for Optional types)
    if "anyOf" in prop:
        types = []
        nullable = False
        for variant in prop["anyOf"]:
            if variant.get("type") == "null":
                nullable = True
            elif "$ref" in variant:
                resolved = _resolve_ref(variant["$ref"], defs)
                types.append(resolved.get("title", "unknown"))
            else:
                types.append(_TS_TYPE_MAP.get(variant.get("type", ""), "unknown"))
        ts = " | ".join(types) if types else "unknown"
        if nullable:
            ts += " | null"
        return ts

    if "$ref" in prop:
        resolved = _resolve_ref(prop["$ref"], defs)
        return resolved.get("title", "unknown")

    json_type = prop.get("type", "unknown")

    if json_type == "array":
        items = prop.get("items", {})
        item_type = _ts_type(items, True, defs)
        return f"{item_type}[]"

    return _TS_TYPE_MAP.get(json_type, "unknown")


def _schema_to_interface(model_cls: type, defs: dict) -> str:
    """Convert a Pydantic model's JSON schema to a TypeScript interface."""
    schema = model_cls.model_json_schema()
    # Merge top-level $defs into shared defs
    for key, val in schema.get("$defs", {}).items():
        defs.setdefault(key, val)

    title = schema.get("title", model_cls.__name__)
    props = schema.get("properties", {})
    required_fields = set(schema.get("required", []))

    # Handle inheritance (allOf)
    if "allOf" in schema:
        parent_ref = schema["allOf"][0].get("$ref", "")
        parent_name = parent_ref.rsplit("/", 1)[-1] if parent_ref else None
        # Merge props from allOf entries
        for entry in schema["allOf"]:
            if "properties" in entry:
                props.update(entry["properties"])
            if "required" in entry:
                required_fields.update(entry["required"])
    else:
        parent_name = None

    lines = []
    extends = f" extends {parent_name}" if parent_name else ""
    lines.append(f"export interface {title}{extends} {{")

    # Skip fields inherited from parent
    parent_props = set()
    if parent_name and parent_name in defs:
        parent_props = set(defs[parent_name].get("properties", {}).keys())

    for camel_name, prop_schema in props.items():
        if camel_name in parent_props:
            continue

        is_required = camel_name in required_fields
        ts_type = _ts_type(prop_schema, is_required, defs)
        optional = "" if is_required else "?"
        lines.append(f"  {camel_name}{optional}: {ts_type};")

    lines.append("}")
    return "\n".join(lines)


def generate() -> str:
    """Generate TypeScript interfaces for all API schemas."""
    # Collect all $defs from all schemas
    all_defs: dict = {}
    for cls in (
        TeamSchema,
        OddsSchema,
        GameSchema,
        GameSummarySchema,
        ScheduleResponseSchema,
    ):
        schema = cls.model_json_schema()
        for key, val in schema.get("$defs", {}).items():
            all_defs.setdefault(key, val)

    interfaces = []
    for cls in (
        TeamSchema,
        OddsSchema,
        GameSchema,
        GameSummarySchema,
        ScheduleResponseSchema,
    ):
        interfaces.append(_schema_to_interface(cls, all_defs))

    header = (
        "/**\n"
        " * AUTO-GENERATED — DO NOT EDIT\n"
        " *\n"
        " * Generated from Pydantic schemas in schemas/game.py\n"
        " * Run: uv run python scripts/generate_types.py\n"
        " */\n"
    )

    return header + "\n\n" + "\n\n".join(interfaces) + "\n"


def main() -> None:
    """Write generated types to the frontend source directory."""
    output = generate()

    out_path = (
        PROJECT_ROOT
        / "sports-tv-guide-app"
        / "src"
        / "types"
        / "generated-api-types.ts"
    )
    out_path.write_text(output)
    print(f"Generated {out_path.relative_to(PROJECT_ROOT)}")

    # Also write JSON schema for contract tests
    json_schema_path = PROJECT_ROOT / "schemas" / "api-contract.json"
    contract = {
        "game": GameSchema.model_json_schema(),
        "gameSummary": GameSummarySchema.model_json_schema(),
        "schedule": ScheduleResponseSchema.model_json_schema(),
        "team": TeamSchema.model_json_schema(),
        "odds": OddsSchema.model_json_schema(),
        "bracket": BracketResponseSchema.model_json_schema(),
    }
    json_schema_path.write_text(json.dumps(contract, indent=2) + "\n")
    print(f"Generated {json_schema_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
