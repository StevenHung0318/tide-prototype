import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Markets } from '@/pages/Markets';
import { VaultDetail } from '@/pages/VaultDetail';
import { Portfolio } from '@/pages/Portfolio';
import { Rewards } from '@/pages/Rewards';
import { Flywheel } from '@/pages/Flywheel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Markets />} />
          <Route path="/vault/:id" element={<VaultDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/flywheel" element={<Flywheel />} />
          <Route path="*" element={<Markets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
