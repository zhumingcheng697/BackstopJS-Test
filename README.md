# BackstopJS-Test

**A Script that Parses YAML Config Files and Automates [BackstopJS](https://github.com/garris/BackstopJS) Tests in Chrome or Firefox Environment.**

## Features

- Select configuration file in a [specific YAML format](#properties-in-the-yaml-config-file) (also see [nyu.yml](nyu.yml)) and parse testing scenarios from it

- Select a specific testing scenario by its index or name (a required property in the [YAML config file](#properties-in-the-yaml-config-file)) and run `backstop reference`, `backstop test`, or `backstop approve` for it

- Automatically test through all the parsed testing scenarios (or all testing scenarios starting with a selected testing scenario) in order

- Automatically approve all the parsed testing scenarios (or all testing scenarios starting with a selected testing scenario) in order

- Pause and resume automatic tests and approvals through keyboard input

- Automate the `backstop reference`, `backstop test`, and `backstop approve` workflow

    > If the necessary test files do not exist before `backstop approve` is run, `backstop test` will be run automatically.
    >
    > If the necessary reference files do not exist before `backstop test` is run, `backstop reference` will be run automatically.

- Easily switch between Chrome and Firefox testing environments

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

    > If you are running in a Firefox environment, you may receive the warning `***WARNING! CHROME VERSION 62 OR GREATER IS REQUIRED. PLEASE UPDATE YOUR CHROME APP!***`. This is because BackstopJS currently does not have native Firefox support and only recognizes the version number of Chrome, but you may safely ignore this warning.

## How to Switch Testing Environments

1. Run the script `switch-environment.js`.
    ```
    $ node switch-environment.js
    ```
    
    or
    
    ```
    $ npm run switch
    ```
   
   > If you want to see the full realtime output of the scripts, set the environment variable `DEBUG_MODE` to any truthy value. Remember that environment variables are handled as `string`s, so anything other than empty spaces (which will ignored by the shell) will result to `true`.
    > ```
    > $ DEBUG_MODE=1 node switch-environment.js
    > ```
    > or
    > ```
    > $ DEBUG_MODE=1 npm run switch
    > ```

2. Wait for the download to finish and start testing!

    > If you have accidentally terminated `switch-environment.js` before it finishes running, don’t worry, simply run it again. The script will ask you which environment (Chrome or Firefox) to install.

## Commands

- `auto run` - Start running `backstop test` on parsed testing scenarios automatically.

- `approve all` - Start running `backstop approve` on parsed testing scenarios automatically.

- `show list` - See a list of all the parsed testing scenarios.

## Properties in the YAML Config File

`urls` - Required. An array where all the testing scenarios reside.

- `urls[n].name` - Required. A **unique** name or identifier of each testing scenario.
- `urls[n].url1` - Required. Testing URL.
- `urls[n].url2` - Optional. Reference URL.
- `urls[n].delay` - Optional. Number of seconds to wait before running tests.
- `urls[n].screen_sizes` - Required. An array containing the screen sizes that should be tested for each testing scenario. Each element should be formatted as `<screen_width>X<screen_height>`, such as `1920X1080`.