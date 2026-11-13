export const SOURCE_LABELS: Record<string, { name: string; short: string; feeds: string }> = {
  nearblocks_charts: {
    name: 'NearBlocks charts API',
    short: 'NearBlocks',
    feeds: 'Transactions, active/new accounts, price, total supply',
  },
  llama_chain_fees: {
    name: 'DefiLlama · NEAR chain fees',
    short: 'DefiLlama · chain fees',
    feeds: 'Daily gas fees (USD)',
  },
  llama_chain_burn: {
    name: 'DefiLlama · NEAR chain revenue',
    short: 'DefiLlama · gas burn',
    feeds: 'Burned share of gas fees (70%)',
  },
  llama_intents_volume: {
    name: 'DefiLlama · NEAR Intents volume',
    short: 'DefiLlama · Intents volume',
    feeds: 'Daily swap input volume (USD)',
  },
  llama_intents_fees: {
    name: 'DefiLlama · NEAR Intents fees',
    short: 'DefiLlama · Intents fees',
    feeds: 'Gross protocol + affiliate fees',
  },
  llama_intents_holders_revenue: {
    name: 'DefiLlama · NEAR Intents holders revenue',
    short: 'DefiLlama · holders revenue',
    feeds: 'Captured revenue directed to buybacks',
  },
}

export const TEST_SOURCES: Record<string, string[]> = {
  T1: ['llama_intents_volume'],
  T2: ['llama_intents_holders_revenue'],
  T3: ['nearblocks_charts'],
  T4: ['llama_chain_fees', 'nearblocks_charts'],
  T5: ['llama_intents_holders_revenue', 'llama_chain_burn', 'nearblocks_charts'],
  T6: ['llama_intents_volume', 'nearblocks_charts'],
}
