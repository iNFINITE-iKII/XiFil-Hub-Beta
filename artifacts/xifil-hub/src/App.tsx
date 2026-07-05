import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import LandingPage from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import ScriptsPage from '@/pages/scripts';
import ScriptDetailPage from '@/pages/script-detail';
import KeysPage from '@/pages/keys';
import AdminPage from '@/pages/admin';
import ProfilePage from '@/pages/profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-mono font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Protocol not found.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 border border-primary/50 text-primary rounded-md hover:bg-primary/10 transition-colors font-mono">
          Return to Base
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/scripts" component={ScriptsPage} />
      <Route path="/scripts/:slug" component={ScriptDetailPage} />
      <Route path="/keys" component={KeysPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
