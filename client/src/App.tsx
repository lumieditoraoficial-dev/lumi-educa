import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Login = lazy(() => import("./pages/Login"));
const SelectSchool = lazy(() => import("./pages/SelectSchool"));
const SystemStatus = lazy(() => import("./pages/SystemStatus"));
const Signup = lazy(() => import("./pages/Signup"));
const DashboardStudent = lazy(() => import("./pages/DashboardStudent"));
const DashboardEducator = lazy(() => import("./pages/DashboardEducator"));
const DashboardCoordinator = lazy(() => import("./pages/DashboardCoordinator"));
const DashboardEditor = lazy(() => import("./pages/DashboardEditor"));
const DashboardAdmin = lazy(() => import("./pages/DashboardAdmin"));
const DashboardSchool = lazy(() => import("./pages/DashboardSchool"));
const PageEditor = lazy(() => import("./pages/PageEditor"));
const BookPages = lazy(() => import("./pages/BookPages"));
const BookReader = lazy(() => import("./pages/BookReader"));
const Library = lazy(() => import("./pages/Library"));
const Messages = lazy(() => import("./pages/Messages"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));

function PageLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F4F8F1] px-6 text-center text-[#0F3D2E]">
      <div>
        <img src="/lumi-educa-mark.png" alt="" className="mx-auto h-16 w-16 animate-pulse object-contain" />
        <p className="mt-4 text-lg font-black">Lumi Educa</p>
        <p className="mt-1 text-sm text-slate-500">Carregando seu ambiente...</p>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={Login} />
        <Route path={"/select-school"} component={SelectSchool} />
        <Route path={"/status"} component={SystemStatus} />
        <Route path={"/signup"} component={Signup} />
        <Route path={"/dashboard/student"} component={DashboardStudent} />
        <Route path={"/dashboard/educator"} component={DashboardEducator} />
        <Route path={"/dashboard/coordinator"} component={DashboardCoordinator} />
        <Route path={"/dashboard/editor"} component={DashboardEditor} />
        <Route path={"/dashboard/admin"} component={DashboardAdmin} />
        <Route path={"/dashboard/school"} component={DashboardSchool} />
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
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
