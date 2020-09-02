# Journal

### Monday: August 31, 2020

- Installed [BackstopJS](https://github.com/garris/BackstopJS) node module, initiated Backstop environment, and tested Backstop on [my site](https://zhumingcheng697.github.io/Portfolio-Site/) and the [NYU home page](https://www.nyu.edu/) using the provided `backstop.json`

- Tested with `readySelector`, `delay`, `hoverSelector`, `clickSelector`, `postInteractionWait`, and other properties

- Found out that certain `hoverSelector` and `clickSelector` did not work on the NYU home page and threw errors for some reason

- Found out about the timeout thresholds of Backstop

### Tuesday: September 1, 2020

- Realized that the `hoverSelector` does not seem to work on HTML elements in `<header>` or `<footer>`

- Realized that the `clickSelector` does not seem to work on HTML elements not visible in the viewport

- Installed [yaml](https://www.npmjs.com/package/yaml) node module and converted config file in `.yml` format into JavaScript object literal format that Backstop accepts

- Ran Backstop tests in a (node) `.js` file

- Started testing with listening keyboard input from the console when running (node) `.js` files in the console