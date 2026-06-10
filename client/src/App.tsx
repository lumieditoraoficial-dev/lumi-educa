import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardStudent from "./pages/DashboardStudent";
import DashboardEducator from "./pages/DashboardEducator";
import DashboardCoordinator from "./pages/DashboardCoordinator";
import DashboardEditor from "./pages/DashboardEditor";
import DashboardAdmin from "./pages/DashboardAdmin";
import PageEditor from "./pages/PageEditor";
import BookPages from "./pages/BookPages";
import BookReader from "./pages/BookReader";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      <Route path={"/dashboard/student"} component={DashboardStudent} />
      <Route path={"/dashboard/educator"} component={DashboardEducator} />
      <Route path={"/dashboard/coordinator"} component={DashboardCoordinator} />
      <Route path={"/dashboard/editor"} component={DashboardEditor} />
      <Route path={"/dashboard/admin"} component={DashboardAdmin} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/page-editor"} component={PageEditor} />
      <Route path={"/books/:bookId/pages"}>
        {(params) => <BookPages bookId={Number(params.bookId)} />}
      </Route>
      <Route path={"/library/book/:bookId"}>
        {(params) => <BookReader bookId={Number(params.bookId)} />}
      </Route>
      <Route path={"/library"} component={Library} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
