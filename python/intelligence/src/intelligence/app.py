from intelligence.deal_risk import assess_deal_risk
from fastapi import FastAPI

from intelligence.models import (
    AccountHealthRequest,
    DealRiskRequest,
    EntityResolutionRequest,
    SignalRankingRequest,
)
from intelligence.ranking import rank_signals
from intelligence.resolution import resolve_entities
from intelligence.scoring import score_account_health

app = FastAPI(title="sales-mcp heuristic scoring", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score/account-health")
def account_health(request: AccountHealthRequest):
    return score_account_health(request)


@app.post("/score/deal-risk")
def deal_risk(request: DealRiskRequest):
    return assess_deal_risk(request)


@app.post("/resolve/entities")
def entities(request: EntityResolutionRequest):
    return resolve_entities(request)


@app.post("/rank/signals")
def signals(request: SignalRankingRequest):
    return rank_signals(request)
