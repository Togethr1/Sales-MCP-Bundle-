import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from intelligence.deal_risk import assess_deal_risk
from intelligence.models import AccountHealthRequest, DealRiskRequest, SignalInput, SignalRankingRequest
from intelligence.ranking import rank_signals
from intelligence.scoring import score_account_health


class HeuristicScoringTests(unittest.TestCase):
    def test_account_health_flags_touch_gap_and_missing_decision_maker(self) -> None:
        response = score_account_health(
            AccountHealthRequest(
                account_name="Acme Analytics",
                opportunity_stage="Proposal",
                days_since_last_touch=10,
                has_confirmed_decision_maker=False,
                signals=[SignalInput(title="Customer replied to security follow-up", category="engagement", score=0.7)],
            )
        )

        self.assertLess(response.health_score, 0.65)
        self.assertTrue(any(risk.label == "Recent touch gap" for risk in response.risks))
        self.assertIn("decision maker", response.recommendation.lower())

    def test_deal_risk_prefers_decision_maker_step_when_authority_is_missing(self) -> None:
        response = assess_deal_risk(
            DealRiskRequest(
                account_name="Acme Analytics",
                opportunity_stage="Proposal",
                days_since_last_touch=8,
                has_confirmed_decision_maker=False,
                has_champion=True,
                signals=[SignalInput(title="Champion replied", category="engagement", score=0.8)],
            )
        )

        self.assertEqual(response.next_step_type, "confirm_decision_maker")
        self.assertTrue(any(factor.label == "Proposal-stage stall risk" for factor in response.factors))
        self.assertGreater(response.stall_risk_score, 0.3)

    def test_signal_ranking_returns_rationale(self) -> None:
        response = rank_signals(
            SignalRankingRequest(
                signals=[
                    SignalInput(title="Acme launches enterprise security workflow", category="news", score=0.55),
                    SignalInput(title="Acme hiring platform engineers", category="hiring", score=0.5),
                ]
            )
        )

        self.assertEqual(len(response.ranked_signals), 2)
        self.assertTrue(all(signal.rationale for signal in response.ranked_signals))
        self.assertGreaterEqual(
            response.ranked_signals[0].adjusted_score,
            response.ranked_signals[1].adjusted_score,
        )


if __name__ == "__main__":
    unittest.main()
