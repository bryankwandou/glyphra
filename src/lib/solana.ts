import 'server-only';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, clusterApiUrl,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createHash } from 'node:crypto';

/**
 * On-chain proof that a specific problem was solved.
 *
 * The claim being made is narrow and worth stating exactly: a wallet holding a
 * Glyphra credential solved a problem of a stated technique and difficulty, at
 * a stated time, and the issuer confirms it. That is all. It does not certify
 * competence, and it does not prove the holder solved it unaided.
 *
 * Why put it on a chain at all: a transcript held by one institution is worth
 * only as much as that institution's willingness to answer questions about it
 * years later. An attestation anchored publicly can be checked by anyone,
 * forever, without asking permission. The record is deliberately a hash — no
 * student name, no answer, nothing that would leak a problem's solution or
 * personal data onto a permanent public ledger.
 *
 * Devnet only. Nothing here should ever touch mainnet.
 */

export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface Attestation {
  technique: string;
  difficulty: number;
  seed: string;
  solvedAt: string;
  digest: string;
}

function issuerKeypair(): Keypair | null {
  const raw = process.env.SOLANA_ISSUER_SECRET?.trim();
  if (!raw) return null;
  try {
    // Accepts either a base58 64-byte secret key, or a 32-byte hex seed.
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Keypair.fromSeed(Buffer.from(raw, 'hex'));
    }
    const decoded = bs58.decode(raw);
    if (decoded.length === 64) return Keypair.fromSecretKey(decoded);
    if (decoded.length === 32) return Keypair.fromSeed(decoded);
    return null;
  } catch {
    return null;
  }
}

export function issuerAddress(): string | null {
  return issuerKeypair()?.publicKey.toBase58() ?? null;
}

export function connection(): Connection {
  const url = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  return new Connection(url, 'confirmed');
}

/**
 * Digest binds the attestation to the exact problem and the exact answer
 * without revealing either. Anyone holding the original problem can recompute
 * it and confirm the record refers to that problem; anyone who does not cannot
 * work backwards to the plaintext.
 */
export function attestationDigest(params: {
  technique: string;
  seed: string;
  plaintext: string;
  solver: string;
}): string {
  return createHash('sha256')
    .update(`glyphra:v1:${params.technique}:${params.seed}:${params.plaintext}:${params.solver}`)
    .digest('hex');
}

export interface AnchorResult {
  ok: boolean;
  signature?: string;
  explorer?: string;
  issuer?: string;
  cluster: string;
  memo?: string;
  error?: string;
}

/**
 * Write the attestation to devnet as a memo instruction.
 *
 * A memo is the right primitive here: the record is a public, timestamped,
 * immutable note, and that is exactly the whole requirement. Deploying a custom
 * program to store the same string would add an audit surface and a deployment
 * to maintain without making the record any more verifiable.
 */
export async function anchorAttestation(att: Attestation): Promise<AnchorResult> {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
  const payer = issuerKeypair();

  if (!payer) {
    return {
      ok: false,
      cluster,
      error: 'No issuer key is configured, so credentials cannot be anchored.',
    };
  }

  const memo = JSON.stringify({
    p: 'glyphra',
    v: 1,
    t: att.technique,
    d: att.difficulty,
    s: att.seed,
    ts: att.solvedAt,
    h: att.digest.slice(0, 32),
  });

  try {
    const conn = connection();

    const balance = await conn.getBalance(payer.publicKey);
    if (balance === 0) {
      return {
        ok: false,
        cluster,
        issuer: payer.publicKey.toBase58(),
        memo,
        error:
          'The issuer account holds no devnet SOL, so it cannot pay the fee. ' +
          'Fund it at faucet.solana.com and try again.',
      };
    }

    const ix = new TransactionInstruction({
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    });

    const tx = new Transaction().add(ix);
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
    tx.sign(payer);

    const signature = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    return {
      ok: true,
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
      issuer: payer.publicKey.toBase58(),
      cluster,
      memo,
    };
  } catch (e) {
    return {
      ok: false,
      cluster,
      issuer: payer.publicKey.toBase58(),
      memo,
      error: (e as Error).message,
    };
  }
}
