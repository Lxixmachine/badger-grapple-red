from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from genome.decoders.metatile_attributes import MetatileAttributes
from genome.models import BlockCell


class Traversability(str, Enum):
    DEFINITE_BLOCKER = "definite_blocker"
    CANDIDATE_FLOOR = "candidate_floor"
    CONDITIONAL = "conditional"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class SemanticCell:
    x: int
    y: int
    metatile_id: int
    collision: int
    elevation: int
    behavior: int | None
    terrain: int | None
    encounter_type: int | None
    layer_type: int | None
    traversability: Traversability
    reason: str


@dataclass(frozen=True)
class BehaviorPolicy:
    blocked_behaviors: frozenset[int] = frozenset()
    conditional_behaviors: frozenset[int] = frozenset()
    passable_behaviors: frozenset[int] = frozenset()


def classify_cell(
    cell: BlockCell,
    attributes: MetatileAttributes | None,
    policy: BehaviorPolicy,
) -> SemanticCell:
    if cell.collision != 0:
        return SemanticCell(
            x=cell.x, y=cell.y, metatile_id=cell.metatile_id,
            collision=cell.collision, elevation=cell.elevation,
            behavior=attributes.behavior if attributes else None,
            terrain=attributes.terrain if attributes else None,
            encounter_type=attributes.encounter_type if attributes else None,
            layer_type=attributes.layer_type if attributes else None,
            traversability=Traversability.DEFINITE_BLOCKER,
            reason=f"map block collision class is {cell.collision}, not 0",
        )

    if attributes is None:
        return SemanticCell(
            x=cell.x, y=cell.y, metatile_id=cell.metatile_id,
            collision=cell.collision, elevation=cell.elevation,
            behavior=None, terrain=None, encounter_type=None, layer_type=None,
            traversability=Traversability.UNKNOWN,
            reason="metatile attributes unavailable",
        )

    behavior = attributes.behavior
    if behavior in policy.blocked_behaviors:
        state = Traversability.DEFINITE_BLOCKER
        reason = f"behavior {behavior} is policy-classified as blocked"
    elif behavior in policy.conditional_behaviors:
        state = Traversability.CONDITIONAL
        reason = f"behavior {behavior} requires mechanics or state"
    elif behavior in policy.passable_behaviors:
        state = Traversability.CANDIDATE_FLOOR
        reason = f"collision is 0 and behavior {behavior} is policy-classified as passable"
    else:
        state = Traversability.UNKNOWN
        reason = f"collision is 0 but behavior {behavior} has no reviewed policy"

    return SemanticCell(
        x=cell.x, y=cell.y, metatile_id=cell.metatile_id,
        collision=cell.collision, elevation=cell.elevation,
        behavior=attributes.behavior,
        terrain=attributes.terrain,
        encounter_type=attributes.encounter_type,
        layer_type=attributes.layer_type,
        traversability=state,
        reason=reason,
    )
