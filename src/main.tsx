import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Cria uma instância do QueryClient
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);