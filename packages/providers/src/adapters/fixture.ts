import type { AccountQuery, ProviderAccountContext, ProviderMode, ProviderName } from "@sales-mcp/core";
import { accountStatusFixture } from "@sales-mcp/fixtures";
import { BaseProviderAdapter } from "./base.js";

export class FixtureProviderAdapter extends BaseProviderAdapter {
  constructor(provider: ProviderName, mode: ProviderMode = "fixture") {
    super(provider, mode);
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    const match = accountStatusFixture.find((context) => {
      const matchedName = context.account?.name ?? "Acme Analytics";
      return (
        context.provider === this.provider &&
        matchedName.toLowerCase() === query.accountName.toLowerCase()
      );
    });

    return match ?? null;
  }
}

