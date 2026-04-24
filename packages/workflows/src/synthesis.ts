import type { IntelligenceClient, Person, Signal } from "@sales-mcp/core";

function personIdentityKey(person: Person): string {
  return person.email ?? `${person.fullName}:${person.title}`;
}

function choosePreferredPerson(people: Person[]): Person {
  const score = (person: Person) =>
    (person.email ? 2 : 0) +
    (person.role && person.role !== "unknown" ? 2 : 0) +
    person.attributions.length;

  return [...people].sort((left, right) => score(right) - score(left))[0]!;
}

function mergePeople(people: Person[]): Person {
  const preferred = choosePreferredPerson(people);
  const attributions = new Map(
    people
      .flatMap((person) => person.attributions)
      .map((attribution) => [
        `${attribution.provider}:${attribution.sourceRecordId}`,
        attribution,
      ]),
  );

  return {
    ...preferred,
    email: people.find((person) => person.email)?.email ?? preferred.email,
    role:
      people.find((person) => person.role && person.role !== "unknown")?.role ?? preferred.role,
    attributions: [...attributions.values()],
  };
}

function fallbackResolvePeople(people: Person[]): Person[] {
  const grouped = new Map<string, Person[]>();

  for (const person of people) {
    const key = personIdentityKey(person);
    const cluster = grouped.get(key) ?? [];
    cluster.push(person);
    grouped.set(key, cluster);
  }

  return [...grouped.values()].map(mergePeople);
}

export async function resolvePeople(
  people: Person[],
  intelligenceClient?: IntelligenceClient,
): Promise<Person[]> {
  if (people.length === 0) {
    return [];
  }

  if (!intelligenceClient) {
    return fallbackResolvePeople(people);
  }

  const peopleByMember = new Map<string, Person>();
  for (const person of people) {
    const memberKey = `${person.attributions[0]?.provider ?? "salesforce"}:${person.id}`;
    peopleByMember.set(memberKey, person);
  }

  const clusters = await intelligenceClient.resolveEntities({
    records: people.map((person) => ({
      provider: person.attributions[0]?.provider ?? "salesforce",
      externalId: person.id,
      label: person.fullName,
      email: person.email,
      domain: person.email?.split("@")[1],
    })),
  });

  const resolved = clusters.map((cluster) => {
    const clusterPeople = cluster.members
      .map((member) => peopleByMember.get(member))
      .filter((person): person is Person => Boolean(person));
    const merged = mergePeople(clusterPeople);

    return {
      ...merged,
      canonicalEntityLabel: cluster.canonicalLabel,
      resolutionConfidence: cluster.confidence,
    };
  });

  return resolved.length > 0 ? resolved : fallbackResolvePeople(people);
}

function fallbackRankSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}

export async function rankSignals(
  signals: Signal[],
  intelligenceClient?: IntelligenceClient,
): Promise<Signal[]> {
  if (signals.length === 0) {
    return [];
  }

  if (!intelligenceClient) {
    return fallbackRankSignals(signals);
  }

  const ranking = await intelligenceClient.rankSignals({
    signals: signals.map((signal) => ({
      title: signal.title,
      category: signal.category,
      score: signal.score ?? 0.5,
      happenedAt: signal.happenedAt,
    })),
  });

  const rankedLookup = new Map(
    ranking.rankedSignals.map((signal, index) => [
      `${signal.title}::${signal.category}`,
      { score: signal.adjustedScore, rationale: signal.rationale, index },
    ]),
  );

  return [...signals].sort((left, right) => {
    const leftRank = rankedLookup.get(`${left.title}::${left.category}`);
    const rightRank = rankedLookup.get(`${right.title}::${right.category}`);

    if (leftRank && rightRank) {
      return leftRank.index - rightRank.index;
    }

    if (leftRank) {
      return -1;
    }

    if (rightRank) {
      return 1;
    }

    return (right.score ?? 0) - (left.score ?? 0);
  }).map((signal) => {
    const ranked = rankedLookup.get(`${signal.title}::${signal.category}`);

    return ranked
      ? {
          ...signal,
          score: ranked.score,
          rankingRationale: ranked.rationale,
        }
      : signal;
  });
}
