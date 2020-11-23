# BackstopJS-Test

**A Script that Parses YAML Config Files and Automates [BackstopJS](https://github.com/garris/BackstopJS) (or, technically, [Backstop-Playwright](https://github.com/zhumingcheng697/Backstop-Playwright)) Tests in Chromium, Firefox, or WebKit Environment.**

## Features

- Select configuration file in a [specific YAML format](#properties-in-the-yaml-config-file) (also see [nyu.yml](nyu.yml)) and parse testing scenarios from it

- Select a specific testing scenario by its index or name (a required property in the [YAML config file](#properties-in-the-yaml-config-file)) and run `backstop reference` (`backstop-playwright reference`), `backstop test` (`backstop-playwright test`), or `backstop approve` (`backstop-playwright approve`) for it

- Automatically test through all the parsed testing scenarios (or all testing scenarios starting with a selected testing scenario) in order

- Automatically approve all the parsed testing scenarios (or all testing scenarios starting with a selected testing scenario) in order

- Pause and resume automatic tests and approvals through keyboard input

- Automate the `reference`, `test`, and `approve` workflow

    > If the necessary test files do not exist before `approve` is run, `test` will be run automatically.
    >
    > If the necessary reference files do not exist before `test` is run, `reference` will be run automatically.

- Easily choose between Chromium, Firefox, and WebKit testing environments

## How to Set Up

1. Clone this repo.
    ```
    $ git clone https://github.com/zhumingcheng697/BackstopJS-Test.git
    ```
   
2. Install necessary node modules.
    ```
    $ npm install
    ```
   
3. Run the script `backstopjs-test.js`.
    ```
    $ node backstopjs-test.js
    ```
   
    or
   
    ```
    $ npm start
    ```
   
4. Follow the instructions and start testing!

## Commands

- `auto run` - Start running `test` on parsed testing scenarios automatically.

- `approve all` - Start running `approve` on parsed testing scenarios automatically.

- `show list` - See a list of all the parsed testing scenarios.

## Properties in the YAML Config File

`urls` - **Required.** An array where all the testing scenarios reside.

- `urls[n].name` - **Required.** A *unique* name or identifier of each testing scenario.
- `urls[n].url1` - **Required.** Testing URL.
- `urls[n].url2` - **Optional.** Reference URL.
- `urls[n].delay` - **Optional.** Number of seconds to wait before running tests. *Defaults to `0` if unset.*
- `urls[n].screen_sizes` - **Optional.** An array containing the screen sizes that should be tested for each testing scenario. Each element should be formatted as `<screen_width>x<screen_height>`, such as `1920x1080`. *Defaults to `320x2500`, `480x2500`, `690x2500`, `930x2500`, and `1200x2500` if unset.*
