import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import MoneyManager from "./components/MoneyManager";
import ProtectedRoute from "./components/ProtectedRoute";
import Payment from "./components/Payment"; // Assuming you have or will create this

import "./App.css";

// const App = () => (
//   <BrowserRouter>
//     <Switch>
//       <Route exact path="/login" component={Login} />
//       <Route exact path="/register" component={Register} />
//       <ProtectedRoute exact path="/" component={MoneyManager} />
//       <ProtectedRoute exact path="/payment/:data" component={Payment} />
//       <Route path="*" render={() => <Redirect to="/login" />} />
//     </Switch>
//   </BrowserRouter>
// );

const App = () => <Register />;

export default App;
