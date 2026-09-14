import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { Markets } from '@/pages/Markets';
import { VaultDetail } from '@/pages/VaultDetail';
import { Portfolio } from '@/pages/Portfolio';
import { Rewards } from '@/pages/Rewards';
import { Navigate } from 'react-router-dom';
import { Analytics } from '@/pages/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Markets />} />
          <Route path="/vault/:id" element={<VaultDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/flywheel" element={<Navigate to="/analytics" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
