from intelligence.models import DealRiskFactor, DealRiskRequest, DealRiskResponse


def assess_deal_risk(request: DealRiskRequest) -> DealRiskResponse:
    factors: list[DealRiskFactor] = []
    stall_risk = 0.18

    if request.opportunity_stage == "Proposal":
        stall_risk += 0.21
        factors.append(
            DealRiskFactor(
                label="Proposal-stage stall risk",
                severity="high",
                score=0.78,
                rationale="Proposal-stage deals need active proof and stakeholder alignment to avoid stalling.",
            )
        )

    if request.days_since_last_touch >= 7:
        stall_risk += 0.17
        factors.append(
            DealRiskFactor(
                label="Recent touch gap",
                severity="medium",
                score=0.71,
                rationale="A week-long touch gap increases the chance that the deal goes inactive.",
            )
        )

    if not request.has_confirmed_decision_maker:
        stall_risk += 0.16
        factors.append(
            DealRiskFactor(
                label="Unconfirmed decision maker",
                severity="medium",
                score=0.69,
                rationale="Champion activity helps, but lack of buying authority keeps the deal at risk.",
            )
        )

    if not request.has_champion:
        stall_risk += 0.13
        factors.append(
            DealRiskFactor(
                label="No active champion",
                severity="high",
                score=0.74,
                rationale="Without an internal champion, internal follow-through is more fragile.",
            )
        )

    engagement_lift = (
        sum(
            signal.score
            for signal in request.signals
            if signal.category in {"engagement", "campaign"}
        )
        * 0.08
    )
    stall_risk_score = max(0.0, min(1.0, stall_risk - engagement_lift))

    if not request.has_confirmed_decision_maker:
        next_step_type = "confirm_decision_maker"
        recommendation = (
            "Re-engage the champion and ask for access to the decision maker before the deal loses momentum."
        )
    elif request.opportunity_stage == "Proposal":
        next_step_type = "share_proof"
        recommendation = (
            "Send proof-oriented follow-up with ROI and security material to move the proposal forward."
        )
    elif stall_risk_score > 0.5:
        next_step_type = "reengage_champion"
        recommendation = "Re-engage the champion with a concise follow-up and confirm next review timing."
    else:
        next_step_type = "schedule_review"
        recommendation = "Schedule a concrete review step to keep the deal advancing."

    return DealRiskResponse(
        account_name=request.account_name,
        stall_risk_score=stall_risk_score,
        next_step_type=next_step_type,
        recommendation=recommendation,
        factors=factors,
    )
