/**
 * Confirms the issuer key resolves to the expected address and reports its
 * devnet balance. Run before trusting the credential flow:
 *
 *   npx tsx --env-file=.env.local scripts/check-solana.ts
 */
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';

const CANDIDATES: { label: string; value: string }[] = [
  { label: 'env SOLANA_ISSUER_SECRET', value: process.env.SOLANA_ISSUER_SECRET ?? '' },
];

function load(raw: string): Keypair | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    if (/^[0-9a-fA-F]{64}$/.test(v)) return Keypair.fromSeed(Buffer.from(v, 'hex'));
    const d = bs58.decode(v);
    if (d.length === 64) return Keypair.fromSecretKey(d);
    if (d.length === 32) return Keypair.fromSeed(d);
  } catch { /* fall through */ }
  return null;
}

async function main() {
  const conn = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');

  for (const c of CANDIDATES) {
    const kp = load(c.value);
    if (!kp) {
      console.log(`${c.label}: could not be parsed as a key`);
      continue;
    }
    const address = kp.publicKey.toBase58();
    let balance = -1;
    try {
      balance = await conn.getBalance(kp.publicKey);
    } catch (e) {
      console.log(`${c.label}: ${address} — RPC error: ${(e as Error).message}`);
      continue;
    }
    console.log(`${c.label}`);
    console.log(`  address: ${address}`);
    console.log(`  balance: ${balance / 1e9} SOL on devnet`);
    console.log(balance > 0
      ? '  ready to pay transaction fees'
      : '  NO FUNDS — top up at https://faucet.solana.com before anchoring');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
