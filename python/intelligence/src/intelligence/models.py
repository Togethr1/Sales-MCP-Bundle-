from pydantic import BaseModel, Field


class SignalInput(BaseModel):
    title: str
    category: str
    score: float = Field(default=0.5, ge=0.0, le=1.0)


class AccountHealthRequest(BaseModel):
    account_name: str
    opportunity_stage: str | None = None
    days_since_last_touch: int = 0
    has_confirmed_decision_maker: bool = False
    signals: list[SignalInput] = Field(default_factory=list)


class RiskScore(BaseModel):
    label: str
    severity: str
    score: float = Field(ge=0.0, le=1.0)
    rationale: str


class AccountHealthResponse(BaseModel):
    account_name: str
    health_score: float = Field(ge=0.0, le=1.0)
    risks: list[RiskScore]
    recommendation: str


class DealRiskRequest(BaseModel):
    account_name: str
    opportunity_stage: str | None = None
    days_since_last_touch: int = 0
    has_confirmed_decision_maker: bool = False
    has_champion: bool = False
    signals: list[SignalInput] = Field(default_factory=list)


class DealRiskFactor(BaseModel):
    label: str
    severity: str
    score: float = Field(ge=0.0, le=1.0)
    rationale: str


class DealRiskResponse(BaseModel):
    account_name: str
    stall_risk_score: float = Field(ge=0.0, le=1.0)
    next_step_type: str
    recommendation: str
    factors: list[DealRiskFactor]


class EntityRecord(BaseModel):
    provider: str
    external_id: str
    label: str
    email: str | None = None
    domain: str | None = None


class EntityResolutionRequest(BaseModel):
    records: list[EntityRecord] = Field(default_factory=list)


class ResolvedCluster(BaseModel):
    canonical_label: str
    confidence: float = Field(ge=0.0, le=1.0)
    strategy: str
    aliases: list[str] = Field(default_factory=list)
    members: list[str]


class EntityResolutionResponse(BaseModel):
    clusters: list[ResolvedCluster]


class SignalRankingRequest(BaseModel):
    signals: list[SignalInput] = Field(default_factory=list)


class RankedSignal(BaseModel):
    title: str
    category: str
    adjusted_score: float = Field(ge=0.0, le=1.0)
    rationale: str


class SignalRankingResponse(BaseModel):
    ranked_signals: list[RankedSignal]
