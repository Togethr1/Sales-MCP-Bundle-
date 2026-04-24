from intelligence.models import AccountHealthRequest, AccountHealthResponse, RiskScore


def score_account_health(request: AccountHealthRequest) -> AccountHealthResponse:
    risk_total = 0.0
    risks: list[RiskScore] = []

    if request.days_since_last_touch >= 7:
        risk_total += 0.28
        risks.append(
            RiskScore(
                label="Recent touch gap",
                severity="medium",
                score=0.72,
                rationale="The account has gone at least a week without a logged interaction.",
            )
        )

    if not request.has_confirmed_decision_maker:
        risk_total += 0.22
        risks.append(
            RiskScore(
                label="Missing decision maker",
                severity="medium",
                score=0.68,
                rationale="The account appears active, but no clear buying authority is confirmed.",
            )
        )

    if request.opportunity_stage == "Proposal":
        risk_total += 0.16
        risks.append(
            RiskScore(
                label="Proposal stall risk",
                severity="high",
                score=0.75,
                rationale="Proposal-stage opportunities are at risk when progress signals are mixed.",
            )
        )

    positive_signal_lift = sum(signal.score for signal in request.signals[:3]) * 0.08
    health_score = max(0.0, min(1.0, 0.7 - risk_total + positive_signal_lift))

    recommendation = (
        "Re-engage the champion with proof-driven follow-up and request access to the decision maker."
        if health_score < 0.65
        else "Maintain momentum with a concise follow-up and align on success criteria."
    )

    return AccountHealthResponse(
        account_name=request.account_name,
        health_score=health_score,
        risks=risks,
        recommendation=recommendation,
    )

