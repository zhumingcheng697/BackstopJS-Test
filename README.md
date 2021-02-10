# BackstopJS-Test

**A Script that Automates [BackstopJS](https://github.com/garris/BackstopJS) (or, technically, [Backstop-Playwright](https://github.com/zhumingcheng697/Backstop-Playwright)) Tests in Chromium, Firefox, or WebKit Environment, and Deploys Failed Reports onto S3 Buckets.**

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

- Easily switch between Chromium, Firefox, and WebKit testing environments

- [Combine all failed test results into one html report and optionally render a PDF version of it](#how-to-combine-reports)

- [Deploy combined reports and supporting files onto an S3 bucket](#how-to-deploy-reports)

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

## How to Combine Reports

1. Run the script `combine-reports.js`.
    ```
    $ node combine-reports.js
    ```

    or

    ```
    $ npm run combine
    ```
   
    > You can also pass in the browser environments for which to combine the reports in the command.
    > ```
    > $ node combine-reports.js chromium firefox
    > ```
    >
    > or
    >
    > ```
    > $ npm run combine w
    > ```
   
    > To render a PDF version of the report, set the environment variable `PDF` to any truthy value. Remember that environment variables are handled as strings, so anything other than empty spaces (which will ignored by the shell) will result to true. **Keep in mind that the render may take a while and could be computationally heavy if there are many failed test scenarios.**
    > ```
    > $ PDF=1 node combine-reports.js
    > ```
    >
    > or
    >
    > ```
    > $ PDF=1 npm run combine
    > ```

2. Wait for the combined report to open.

## How to Deploy Reports

1. Create a [shared configurations file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) with your AWS credentials.
    ```
    [default]
    aws_access_key_id = <YOUR_ACCESS_KEY_ID>
    aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY>
    ```

2. Make sure you have already [combined a report](#how-to-combine-reports).

3. Run the script `deploy-reports.js`.
    ```
    $ node deploy-reports.js
    ```

    or

    ```
    $ npm run deploy
    ```

    > Just like when combining reports, you can also pass in the browser environments for which to deploy the reports in the command.
    > ```
    > $ node deploy-reports.js chromium firefox
    > ```
    >
    > or
    >
    > ```
    > $ npm run deploy w
    > ```

    > **By default, reference images will not be updated to save time and bandwidth. To overwrite the old reference images, set the environment variable `OVERWRITE_REFERENCE` to any truthy value, or call `npm run overwrite-deploy`.**
    > ```
    > $ OVERWRITE_REFERENCE=1 node deploy-reports.js
    > ```
    >
    > or
    >
    > ```
    > $ npm run overwrite-deploy
    > ```

## Commands

- `auto run` - Start running `test` on parsed testing scenarios automatically.

- `approve all` - Start running `approve` on parsed testing scenarios automatically.

- `combine reports` - Generate an HTML report by combining results of all previously failed tests.

- `show list` - See a list of all the parsed testing scenarios.

## Properties in the YAML Config File

`urls` - **Required.** An array where all the testing scenarios reside.

- `urls[n].name` - **Required.** A *unique* name or identifier of each testing scenario.
- `urls[n].url1` - **Required.** Testing URL.
- `urls[n].url2` - **Optional.** Reference URL.
- `urls[n].delay` - **Optional.** Number of seconds to wait before running tests. *Defaults to `0` if unset.*
- `urls[n].screen_sizes` - **Optional.** An array containing the screen sizes that should be tested for each testing scenario. Each element should be formatted as `<screen_width>x<screen_height>`, such as `1920x1080`. *Defaults to `320x2500`, `480x2500`, `690x2500`, `930x2500`, and `1200x2500` if unset.*
