import React, { Component } from "react";
import "./App.css";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Plot from "react-plotly.js";

import Decimal from "decimal.js";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      input1: "",
      showResult: false,
      result: "",
      part2Value: "",
      part2Result: 0,
      showResultPart2: false,
      showResultPart3: false,
      plotX: [],
      plotY: [],
    };
    this.onFormSubmit = this.onFormSubmit.bind(this);
  }

  onFormSubmit = (e) => {
    e.preventDefault();
    let input = this.state.input1;
    if (input.includes("=")) {
      this.setState({ showResultPart3: true });
      let res = this.parseEquation(input);
      console.log(res);
    } else {
      let result = input.replace(/\s/g, "");

      var regExp = /\([^()"]*(?:"[^"]*"[^()"]*)*\)/;
      var matches = regExp.exec(input);
      while (matches && matches[0]) {
        result = this.innerParanthesisReplace(result);
        matches = regExp.exec(result);
        //console.log("result: ", result);
      }
      result = this.calculate(this.parseCalculationString(result));
      console.log("----------", result.d);
      this.setState({ showResult: true });
      this.setState({ result: result.d });
    }
  };

  onPart2Submit = (e) => {
    e.preventDefault();
    let input = this.state.part2Value;
    let inputLength = input.length;
    let result = "";

    for (let x = 0; x < inputLength; x++) {
      result = "";
      for (let i = 0; i < inputLength; i++) {
        let currNum = input[i];
        let nextNum = input[i + 1];

        if (currNum > nextNum) {
          result = result + (parseInt(input[i]) - 1).toString();
          for (let j = i + 1; j < inputLength; j++) {
            result = result + "9";
          }
          break;
        } else {
          result = result + input[i];
          if (i == inputLength - 1) {
            result = result + input[i + 1];
          }
        }
      }
      console.log("----------", result);

      input = result;
    }

    var lastresult = parseInt(result);
    this.setState({ part2Result: lastresult });
    this.setState({ showResultPart2: true });
  };

  innerParanthesisReplace(input) {
    var regExp = /\([^()"]*(?:"[^"]*"[^()"]*)*\)/;
    var matches = regExp.exec(input);
    var value = matches[0].substring(1, matches[0].length - 1);
    var calculatedParanthersis = this.calculate(
      this.parseCalculationString(value)
    );
    var newString = input.replace(matches[0], calculatedParanthersis);
    return newString;
  }

  parseCalculationString(s) {
    // --- Parse a calculation string into an array of numbers and operators
    var calculation = [],
      current = "";
    for (var i = 0, ch; (ch = s.charAt(i)); i++) {
      if ("^*/+-".indexOf(ch) > -1) {
        if (current == "" && ch == "-") {
          current = "-";
        } else {
          calculation.push(new Decimal(current), ch);
          current = "";
        }
      } else {
        current += s.charAt(i);
      }
    }
    if (current != "") {
      calculation.push(new Decimal(current));
    }
    return calculation;
  }

  parseEquation(input) {
    // Important that white spaces are removed first
    input = input.replace(/\s+/g, ""); // remove whitespaces
    input = input.replace(/([\-\+])([xy])/g, "$11$2"); // convert -x -y or +x +y to -1x -1y or +1x +1y
    // just to make the logic below a little simpler
    var newTerm = () => {
      term = { val: null, scalar: 1, left: left };
    }; // create a new term
    var pushTerm = () => {
      terms.push(term);
      term = null;
    }; // push term and null current
    // regExp [xy=] gets "x","y", or "="" or [\-\+]??[0-9\.]+  gets +- number with decimal
    var reg = /[xy=]|[\-\+]??[0-9\.eE]+/g; // regExp to split the input string into parts
    var parts = input.match(reg); // get all the parts of the equation
    var terms = []; // an array of all terms parsed
    var term = null; // Numbers as constants and variables with scalars are terms
    var left = true; // which side of equation a term is
    parts.forEach((p) => {
      if (p === "x" || p === "y") {
        if (term !== null && term.val !== null) {
          // is the variable defined
          pushTerm(); // yes so push to the stack and null
        }
        if (term === null) {
          newTerm();
        } // do we need a new term?
        term.val = p;
      } else if (p === "=") {
        // is it the equals sign
        if (!left) {
          throw new SyntaxError("Unxpected `=` in equation.");
        }
        if (term === null) {
          throw new SyntaxError("No left hand side of equation.");
        } // make sure that there is a left side
        terms.push(term); // push the last left side term onto the stack
        term = null;
        left = false; // everything on the right from here on in
      } else {
        // all that is left are numbers (we hope)
        if (isNaN(p)) {
          throw new SyntaxError("Unknown value '" + p + "' in equation");
        } //check that there is a number
        if (term !== null && (p[0] === "+" || p[0] === "-")) {
          // check if number is a new term
          pushTerm(); // yes so push to the stack and null
        }
        if (term === null) {
          newTerm();
        } // do we need a new term?
        term.scalar *= Number(p); // set the scalar to the new value
      }
    });

    if (term !== null) {
      // there may or may not be a term left to push to the stack
      pushTerm();
    }
    // now simplify the equation getting the scalar for left and right sides . x on left y on right
    var scalarX = 0;
    var scalarY = 0;
    var valC = 0; // any constants
    terms.forEach((t) => {
      t.scalar *= !t.left ? -1 : 1; // everything on right is negative
      if (t.val === "y") {
        scalarY += -t.scalar; // reverse sign
      } else if (t.val === "x") {
        scalarX += t.scalar;
      } else {
        valC += t.scalar;
      }
    });
    // now build the code string for the equation to solve for x and return y
    var code = scalarX + " * x  + (" + valC + ") / " + scalarY;
    this.calculateXandY(scalarX, valC, scalarY);
    //var equation = new Function("x", code); // create the function
    return code;
  }

  calculateXandY(scalarX, valC, scalarY) {
    let tempX = [];
    let tempY = [];

    for (let x = -1000; x < 1000; x++) {
      tempX.push(x);
      tempY.push((scalarX * x + valC) / scalarY);
    }
    this.setState({ plotX: tempX });
    this.setState({ plotY: tempY });
  }

  calculate(calc) {
    // --- Perform a calculation expressed as an array of operators and numbers
    var ops = ["^", "*", "/", "+", "-"],
      opFunctions = [
        function (a, b) {
          return a.pow(b);
        },

        function (a, b) {
          return a.mul(b);
        },

        function (a, b) {
          return a.div(b);
        },

        function (a, b) {
          return a.add(b);
        },

        function (a, b) {
          return a.sub(b);
        },
      ],
      newCalc = [],
      currentOp;
    for (var i = 0; i < ops.length; i++) {
      // console.log(ops[i]);
      for (var j = 0; j < calc.length; j++) {
        if (calc[j] == ops[i]) {
          currentOp = opFunctions[i];
        } else if (currentOp) {
          newCalc[newCalc.length - 1] = currentOp(
            newCalc[newCalc.length - 1],
            calc[j]
          );
          currentOp = null;
        } else {
          newCalc.push(calc[j]);
        }
        // console.log(newCalc);
      }
      calc = newCalc;
      newCalc = [];
    }
    if (calc.length > 1) {
      // console.log("Error: unable to resolve calculation");
      return calc;
    } else {
      return calc[0];
    }
  }

  render() {
    return (
      <div className="Wrapper">
        <Container>
          <h1>Part 1 and 3</h1>
          <Row className="part">
            <Col>
              <Form onSubmit={(e) => this.onFormSubmit(e)}>
                <Form.Group
                  controlId="formInput"
                  onChange={(e) => this.setState({ input1: e.target.value })}
                >
                  <Form.Label>Term Calculator</Form.Label>
                  <Form.Control type="text" placeholder="Enter the term" />
                  <Form.Text className="text-muted">
                    Please enter a term you want to be calculated.
                  </Form.Text>
                </Form.Group>

                <Button variant="primary" type="submit">
                  Submit
                </Button>
              </Form>
            </Col>
            <Col className="result">
              {this.state.showResult ? (
                <h3>Result : {this.state.result}</h3>
              ) : (
                <></>
              )}
              {this.state.showResultPart3 ? (
                <Plot
                  data={[
                    {
                      x: this.state.plotX,
                      y: this.state.plotY,
                      type: "scatter",
                      mode: "lines+markers",
                      marker: { color: "red" },
                    },
                  ]}
                />
              ) : (
                <></>
              )}
            </Col>
          </Row>
          <h1>Part 2</h1>
          <Row className="part">
            <Col>
              <Form onSubmit={(e) => this.onPart2Submit(e)}>
                <Form.Group
                  controlId="formInput"
                  onChange={(e) =>
                    this.setState({ part2Value: e.target.value })
                  }
                >
                  <Form.Label>Peter Meditation Exercise Calculator</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter a number Peter"
                  />
                  <Form.Text className="text-muted">
                    Please enter a number Peter.
                  </Form.Text>
                </Form.Group>

                <Button variant="primary" type="submit">
                  Submit
                </Button>
              </Form>
            </Col>
            <Col className="result">
              {this.state.showResultPart2 ? (
                <h3>Here is the result Peter : {this.state.part2Result}</h3>
              ) : (
                <></>
              )}
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
