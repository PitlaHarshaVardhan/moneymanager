import { BrowserRouter, Route, Switch } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import MoneyManager from "./components/MoneyManager";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

const App = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/login" component={Login} />
      <Route exact path="/register" component={Register} />
      <ProtectedRoute exact path="/" component={MoneyManager} />
    </Switch>
  </BrowserRouter>
);

export default App;
