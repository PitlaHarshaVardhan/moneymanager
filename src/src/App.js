import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import MoneyManager from "./components/MoneyManager";
import ProtectedRoute from "./components/ProtectedRoute";
import Payment from "./components/Payment"; // Assuming this exists
import NotFound from "./components/NotFound"; // Already imported in your original
import "./App.css";

const App = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/login" component={Login} />
      <Route exact path="/register" component={Register} />
      <ProtectedRoute exact path="/" component={MoneyManager} />
      <ProtectedRoute exact path="/payment/:data" component={Payment} />
      <Route exact path="/not-found" component={NotFound} />
      {/* Redirect any unmatched routes to /not-found */}
      <Redirect from="*" to="/not-found" />
    </Switch>
  </BrowserRouter>
);

export default App;
