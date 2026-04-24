from intelligence.models import (
    EntityResolutionRequest,
    EntityResolutionResponse,
    EntityRecord,
    ResolvedCluster,
)

def _normalized_label(label: str) -> str:
    return " ".join(label.lower().replace("-", " ").split())


def _cluster_key(record: EntityRecord) -> tuple[str, str]:
    if record.email:
        return ("email", record.email.lower())
    if record.domain:
        return ("domain", record.domain.lower())
    return ("label", _normalized_label(record.label))


def _canonical_label(records: list[EntityRecord]) -> str:
    label_candidates = [record.label for record in records if "@" not in record.label]
    if label_candidates:
        return sorted(label_candidates, key=lambda label: (-len(label), label.lower()))[0]
    return records[0].label


def _confidence_for_cluster(strategy: str, size: int) -> float:
    base = {"email": 0.88, "domain": 0.7, "label": 0.58}[strategy]
    return min(0.96, base + max(0, size - 1) * 0.04)


def resolve_entities(request: EntityResolutionRequest) -> EntityResolutionResponse:
    grouped: dict[tuple[str, str], list[EntityRecord]] = {}

    for record in request.records:
        key = _cluster_key(record)
        grouped.setdefault(key, []).append(record)

    clusters = [
        ResolvedCluster(
            canonical_label=_canonical_label(records),
            confidence=_confidence_for_cluster(strategy, len(records)),
            strategy=strategy,
            aliases=sorted({record.label for record in records}),
            members=[f"{record.provider}:{record.external_id}" for record in records],
        )
        for (strategy, _), records in grouped.items()
    ]

    return EntityResolutionResponse(clusters=clusters)
