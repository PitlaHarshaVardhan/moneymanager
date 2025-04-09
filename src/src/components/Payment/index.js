import { Component } from "react";
import { withRouter } from "react-router-dom";

class Payment extends Component {
  render() {
    const { data } = this.props.match.params; // Access QR code data
    return (
      <div>
        <h1>Payment Page</h1>
        <p>Scanned Data: {data}</p>
      </div>
    );
  }
}

export default withRouter(Payment);
