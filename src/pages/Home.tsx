import { useSearchParams } from 'react-router-dom';
import { VAULTS, VAULT_BY_ID } from '@/data/vaults';
import { DepositCard } from '@/components/deposit/DepositCard';

/** Home = the deposit card. One input, one button. */
export function Home() {
  const [params, setParams] = useSearchParams();
  const vault = VAULT_BY_ID[params.get('vault') ?? ''] ?? VAULTS[0];
  const amount = params.get('amount') ?? undefined;
  return (
    <div className="pt-6 md:pt-14">
      <DepositCard
        key={vault.id}
        vault={vault}
        initialAmount={amount}
        onVaultChange={(v) => setParams((p) => { const n = new URLSearchParams(p); n.set('vault', v.id); n.delete('amount'); return n; })}
      />
    </div>
  );
}
