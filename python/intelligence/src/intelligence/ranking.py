from intelligence.models import RankedSignal, SignalRankingRequest, SignalRankingResponse

CATEGORY_WEIGHTS = {
    "funding": 0.14,
    "hiring": 0.1,
    "technology": 0.08,
    "intent": 0.12,
    "campaign": 0.06,
    "news": 0.09,
    "engagement": 0.11,
}

KEYWORD_BOOSTS = {
    "launch": 0.05,
    "funding": 0.07,
    "series": 0.07,
    "hire": 0.05,
    "hiring": 0.05,
    "enterprise": 0.04,
    "security": 0.04,
    "reply": 0.03,
}


def _score_signal(title: str, category: str, base_score: float) -> tuple[float, str]:
    lowered = title.lower()
    category_weight = CATEGORY_WEIGHTS.get(category, 0.05)
    keyword_boost = sum(
        boost for keyword, boost in KEYWORD_BOOSTS.items() if keyword in lowered
    )
    adjusted = max(0.0, min(1.0, base_score + category_weight + keyword_boost))
    rationale = (
        f"Base score {base_score:.2f} adjusted by {category_weight:.2f} for "
        f"{category} signals and {keyword_boost:.2f} for title keywords."
    )
    return adjusted, rationale


def rank_signals(request: SignalRankingRequest) -> SignalRankingResponse:
    ranked = sorted(
        (
            (
                signal,
                *_score_signal(signal.title, signal.category, signal.score),
            )
            for signal in request.signals
        ),
        key=lambda item: item[1],
        reverse=True,
    )
    return SignalRankingResponse(
        ranked_signals=[
            RankedSignal(
                title=signal.title,
                category=signal.category,
                adjusted_score=adjusted_score,
                rationale=rationale,
            )
            for signal, adjusted_score, rationale in ranked
        ]
    )
