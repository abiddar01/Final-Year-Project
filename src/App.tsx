import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CompareBar from "./components/CompareBar";
import { CompareProvider } from "./contexts/CompareContext";
import ImportEstimator from "./pages/ImportEstimator";
import Index from "./pages/Index";
import Catalogue from "./pages/Catalogue";
import CarDetail from "./pages/CarDetail";
import CarImportEstimate from "./pages/CarImportEstimate";
import LifestyleMatch from "./pages/LifestyleMatch";
import Compare from "./pages/Compare";
import Admin from "./pages/Admin";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { FEATURES } from "./lib/featureFlags";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompareProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/car-catalogue" element={<Catalogue />} />
              <Route path="/car/:id" element={<CarDetail />} />
              <Route path="/car/import/:id" element={<CarImportEstimate />} />
              <Route path="/lifestyle-match" element={<LifestyleMatch />} />
              <Route path="/import-estimator" element={<ImportEstimator />} />
              {FEATURES.compare && <Route path="/compare" element={<Compare />} />}
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          {FEATURES.compare && <CompareBar />}
        </CompareProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
