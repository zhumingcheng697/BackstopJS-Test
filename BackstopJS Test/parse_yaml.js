const fs = require('fs');
const YAML = require('yaml');
const backstop = require('backstopjs');
const readline = require('readline');

/**
 * Keeps track of the current state of the program.
 *
 * "": choosing mode;
 * "a": auto mode chosen;
 * "r": running auto tests;
 * "n": auto run paused;
 * "m": running in manual mode;
 * "x": switching from manual mode to auto mode;
 *
 * @type {string}
 */
let runMode = "";
let scenarios = [];
let isRunning = false;
let isLastRunSuccessful = true;
let willAutoRunResume = false;
let lastRunAction = "";
let scenarioChosen = false;
let scenarioConfirmed = false;
let scenarioIndex = 0;
let tempScenarioIndex = 0;

/**
 * Makes the console logs colorful.
 *
 * @link https://stackoverflow.com/a/40560590
 * @type {Object}
 */
const logStyle = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

/**
 * Reads the keyboard input from the console.
 *
 * @link http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
 */
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

/**
 * Default Backstop configuration for all runs.
 *
 * @type {Object}
 */
const defaultConfig = {
    report: ["browser"],
    engine: "puppeteer",
    engineOptions: {
        "args": ["--no-sandbox"]
    },
    asyncCaptureLimit: 20,
    asyncCompareLimit: 100,
    debug: false,
    debugWindow: false
};

/**
 * Loads scenarios from a YAML file
 *
 * @param {string} path Path of the YAML config file to load scenarios from
 */
function loadYamlConfig(path) {
    if (path === "") {
        loadYamlConfig("nyu.yml");
    } else if (fs.existsSync(path)) {
        const file = fs.readFileSync(path, "utf8");
        const parsed = YAML.parse(file);
        scenarios = parsed.urls;

        if (scenarios.length <= 0) {
            console.error(`${logStyle.fg.red}No scenarios found. Please choose another file.${logStyle.reset}`);
        } else {
            console.log(`${logStyle.fg.green}${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} loaded${logStyle.reset}`);
            chooseRunModePrompt();
        }
    } else {
        console.error(`${logStyle.fg.red}File does not exist at "${path}". Please type in a valid path.${logStyle.reset}`);
    }
}

function chooseRunModePrompt() {
    console.log(`${logStyle.fg.white}Run in ${logStyle.reset}"auto" (a)${logStyle.fg.white} or ${logStyle.reset}"manual" (m)${logStyle.fg.white} mode?${logStyle.reset}`);
}

function typeInIndexToChoosePrompt() {
    console.log(`${logStyle.fg.green}Type in "auto run" at any time to start auto run${logStyle.reset}`);
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario, type in "--" or "++" to choose the previous or the next scenario, if there is one, or type anything else or press enter to choose ${logStyle.reset}scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.fg.white} by default${logStyle.reset}`);
}

function typeInKeywordToStartPrompt() {
    console.log(`${logStyle.fg.white}Type in a keyword to start: ${logStyle.reset}"test" (t), "approve" (a), "reference" (r)${logStyle.reset}`);
}

/**
 * Chooses which mode to run in depending on keyboard input at the start of the program.
 *
 * @param {string} line Keyboard input
 * @return {void}
 */
function chooseRunMode(line) {
    if (["auto", "a"].includes(line.toLowerCase())) {
        runMode = "a";
        console.log(`${logStyle.fg.green}Running in auto mode${logStyle.reset}`);
        console.warn(`${logStyle.fg.red}All ${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (["manual", "m"].includes(line.toLowerCase())) {
        runMode = "m";
        console.log(`${logStyle.fg.green}Running in manual mode${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (auto/manual/a/m)${logStyle.reset}`);
    }
}

/**
 * Chooses which scenario to run test for depending on keyboard input.
 *
 * @param {string} line Keyboard input
 * @return {void}
 */
function chooseScenario(line) {
    if (line === "++") {
        if (scenarioIndex < scenarios.length - 1) {
            tempScenarioIndex = scenarioIndex + 1;
        }
    } else if (line === "--") {
        if (scenarioIndex > 0) {
            tempScenarioIndex = scenarioIndex - 1;
        }
    } else {
        let foundIndex = scenarios.map((el) => el.name.toLowerCase()).indexOf(line.toLowerCase())
        if (foundIndex >= 0) {
            tempScenarioIndex = foundIndex;
        } else {
            let parsedInt = parseInt(line);
            let parsedIndex = isNaN(parsedInt) ? -1 : parsedInt;
            if (parsedIndex.toString() === line && parsedIndex >= 0 && parsedIndex < scenarios.length) {
                tempScenarioIndex = parsedIndex;
            } else {
                tempScenarioIndex = scenarioIndex;
            }
        }
    }

    if (runMode === "m") {
        console.log(`${logStyle.fg.white}Scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) chosen. Continue? ${logStyle.reset}(y/n)${logStyle.reset}`);
    } else if (runMode === "x") {
        console.warn(`${logStyle.fg.red}All ${scenarios.length - tempScenarioIndex} scenario${scenarios.length - tempScenarioIndex === 1 ? "" : "s"} starting from scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    }

    scenarioChosen = true;
}

/**
 * Confirms whether to choose the scenario chosen by chooseScenario.
 *
 * @see chooseScenario
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmScenario(line) {
    if (line.toLowerCase() === "y") {
        scenarioIndex = tempScenarioIndex;
        scenarioConfirmed = true;
        typeInKeywordToStartPrompt();
    } else if (line.toLowerCase() === "n") {
        scenarioChosen = false;
        tempScenarioIndex = scenarioIndex;
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
    }
}

/**
 * Exits the program from "m" mode and gets the program ready for running auto tests.
 *
 * @see runMode
 * @return {void}
 */
function readyForAutoRun() {
    runMode = "x";
    scenarioChosen = false;
    scenarioConfirmed = false;
    console.log(`${logStyle.fg.green}Switching to auto mode${logStyle.reset}`);
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario to ${logStyle.reset}start the auto run from${logStyle.fg.white}, type in "--" or "++" to choose the previous or the next scenario to ${logStyle.reset}start the auto run from${logStyle.fg.white}, if there is one, or type anything else or press enter to choose ${logStyle.reset}scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.fg.white} by default to ${logStyle.reset}start the auto run from${logStyle.reset}`);
}

/**
 * Confirms whether to resume auto run after the program enters "n" mode.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmResumeAutoRun(line) {
    if (line.toLowerCase() === "y") {
        runMode = "a";
        willAutoRunResume = true;
        let length = scenarios.length - scenarioIndex - ((lastRunAction === "reference" && isLastRunSuccessful) ? 0 : 1);
        let startIndex = scenarioIndex + ((lastRunAction === "reference" && isLastRunSuccessful) ? 0 : 1);
        console.warn(`${logStyle.fg.red}All the rest ${length} scenario${length === 1 ? "" : "s"} starting from scenario ${startIndex} (${scenarios[startIndex].name}) will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (line.toLowerCase() === "n") {
        runMode = "m";
        console.log(`${logStyle.fg.green}Running in manual mode${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
    }
}

/**
 * Confirms whether to start auto run from "a" or "x" modes.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmAutoRun(line) {
    if (line.toLowerCase() === "y") {
        if (runMode === "x") {
            scenarioChosen = false;
            scenarioIndex = tempScenarioIndex;
        }

        runMode = "r";

        if (scenarioIndex !== 0 && willAutoRunResume) {
            if (lastRunAction === "reference" && isLastRunSuccessful) {
                console.log(`${logStyle.fg.green}Resuming automatic run starting from the previous scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.reset}`);
            } else {
                scenarioIndex += 1
                console.log(`${logStyle.fg.green}Resuming automatic run starting from the next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.reset}`);
            }
        }

        if (scenarios.length > 0 && scenarioIndex >= 0 && scenarioIndex < scenarios.length - 1) {
            runBackstop(scenarios[scenarioIndex]);
        }
    } else if (line.toLowerCase() === "n") {
        if (runMode === "x") {
            scenarioChosen = false;
        }

        runMode = "m";
        console.log(`${logStyle.fg.green}Switched to manual mode${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
        return;
    }

    willAutoRunResume = false;
}

/**
 * Resets parameters after runBackstop.
 *
 * @see runBackstop
 * @return {void}
 */
function resetAfterRun() {
    isRunning = false;
    scenarioChosen = false;
    scenarioConfirmed = false;
    setTimeout(typeInIndexToChoosePrompt, 100);
}

/**
 * Runs a Backstop action on a scenario.
 *
 * @param {Object} scenario Scenario to run action on
 * @param {string} action Action to run (test, approve, reference)
 * @return {void}
 */
function runBackstop(scenario, action = "test") {
    /**
     * Handles the outcome of a Backstop action.
     *
     * @see runBackstop
     * @param {boolean} isRunSuccessful Whether the last Backstop action is successful
     * @return {void}
     */
    function runNextSteps(isRunSuccessful) {
        lastRunAction = parsedAction;
        isLastRunSuccessful = isRunSuccessful;

        if (isRunSuccessful) {
            console.log(`${logStyle.fg.green}${parsedAction.toUpperCase()} succeeded for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);
        } else {
            console.error(`${logStyle.fg.red}${parsedAction.toUpperCase()} failed for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);
        }

        if (isRunSuccessful && runMode !== "n" && parsedAction === "reference" && ["t", "a"].includes(action.toLowerCase().charAt(0))) {
            runBackstop(scenario);
        } else {
            if (runMode === "m") {
                resetAfterRun();
            } else if (!isRunSuccessful && parsedAction === "reference") {
                resetAfterRun();
                runMode = "m";
                console.log(`${logStyle.fg.red}Automatically switched to manual mode${logStyle.reset}`);
            } else if (scenarioIndex === scenarios.length - 1) {
                resetAfterRun();
                runMode = "m";
                console.log(`${logStyle.fg.green}All tests completed${logStyle.reset}`);
                console.log(`${logStyle.fg.green}Automatically switched to manual mode${logStyle.reset}`);
            } else {
                if (runMode === "r") {
                    scenarioIndex += 1;
                    console.log(`${logStyle.fg.green}Automatically starting test for next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.reset}`);
                    runBackstop(scenarios[scenarioIndex]);
                } else if (runMode === "n") {
                    isRunning = false;
                    console.warn(`${logStyle.fg.red}Automatic run stopped due to your keyboard input. Resume the rest of the tests? (y/n)${logStyle.reset}`);
                }
            }
        }
    }

    let parsedAction = action.toLowerCase();
    const name = scenario.name.replace(/\s/g, "_");

    isRunning = true;

    if (["test", "t"].includes(parsedAction)) {
        if (fs.existsSync(`backstop_data/bitmaps_reference/${name}`)) {
            parsedAction = "test";
        } else {
            console.error(`${logStyle.fg.red}No previous references exist for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);
            parsedAction = "reference";
        }
    } else if (["approve", "a"].includes(parsedAction)) {
        if (fs.existsSync(`backstop_data/bitmaps_test/${name}`)) {
            parsedAction = "approve";
        } else {
            console.error(`${logStyle.fg.red}No previous tests exist for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);
            if (fs.existsSync(`backstop_data/bitmaps_reference/${name}`)) {
                parsedAction = "test";
            } else {
                console.error(`${logStyle.fg.red}No previous references exist for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);
                parsedAction = "reference";
            }
        }
    } else if (["reference", "r"].includes(parsedAction)) {
        parsedAction = "reference";
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (test/approve/reference/t/a/r)${logStyle.reset}`);
        isRunning = false;
        return;
    }

    console.log(`${logStyle.fg.green}Running ${parsedAction.toUpperCase()} for scenario ${scenarioIndex} (${scenario.name})${logStyle.reset}`);

    let config = Object.assign({}, defaultConfig);

    config.viewports = scenario["screen_sizes"].map((screenSizeStr) => {
        const match = screenSizeStr.match(/([1-9][0-9]*)x([1-9][0-9]*)/);
        return {
            label: screenSizeStr,
            width: parseInt(match[1]),
            height: parseInt(match[2])
        };
    });

    config.paths = {
        bitmaps_reference: `backstop_data/bitmaps_reference/${name}`,
        bitmaps_test: `backstop_data/bitmaps_test/${name}`,
        engine_scripts: `backstop_data/engine_scripts/${name}`,
        html_report: `backstop_data/html_report/${name}`,
        ci_report: `backstop_data/ci_report/${name}`
    };

    config.scenarios = [
        {
            label: name,
            cookiePath: "",
            url: scenario.url1,
            referenceUrl: scenario.url2,
            readyEvent: "",
            readySelector: "",
            delay: parseInt(scenario.delay || "0") === 0 ? 0 : 3000,
            hideSelectors: [],
            removeSelectors: [],
            hoverSelector: "",
            clickSelector: "",
            postInteractionWait: 0,
            selectors: [],
            selectorExpansion: true,
            expect: 0,
            misMatchThreshold : 0.1,
            requireSameDimensions: true
        }
    ];

    backstop(parsedAction, {config: config})
        .then(() => {
            runNextSteps(true);
        }).catch(() => {
            runNextSteps(false);
        }
    );
}

console.log(`${logStyle.fg.white}Please type in the path of the YAML config file to load, or press enter to choose ${logStyle.reset}nyu.yml${logStyle.fg.white} by default${logStyle.reset}`);

/**
 * Handles keyboard input in the console.
 */
rl.on('line', (line) => {
    if (scenarios.length <= 0) {
        loadYamlConfig(line);
        return;
    }

    if (runMode === "r") {
        runMode = "n";
    }

    if (!isRunning) {
        if (runMode === "") {
            chooseRunMode(line);
        } else if (runMode === "a") {
            confirmAutoRun(line);
        } else if (runMode === "m") {
            if (line.toLowerCase() === "auto run") {
                readyForAutoRun();
            } else if (!scenarioChosen) {
                chooseScenario(line);
            } else if (!scenarioConfirmed) {
                confirmScenario(line);
            } else {
                runBackstop(scenarios[scenarioIndex], line);
            }
        } else if (runMode === "x") {
            if (!scenarioChosen) {
                chooseScenario(line);
            } else {
                confirmAutoRun(line);
            }
        } else if (runMode === "n") {
            confirmResumeAutoRun(line);
        }
    }
});