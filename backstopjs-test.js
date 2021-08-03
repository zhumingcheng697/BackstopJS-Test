const fs = require("fs");
const YAML = require("yaml");
const readline = require("readline");
const backstop = require("backstop-playwright");
const combineReports = require("./combine-reports");

const { logStyle, resolveBrowserType, BrowserName } = require("./helper");

/**
 * Default Backstop configuration for all runs.
 *
 * @type {Object}
 */
const defaultConfig = {
    engine: "playwright",
    engineOptions: {
        "args": ["--no-sandbox"]
    },
    asyncCaptureLimit: 20,
    asyncCompareLimit: 100,
    debug: false,
    debugWindow: false
};

/**
 * Reads the keyboard input from the console.
 *
 * @link http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
 */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

/**
 * Keeps track of the current state of the program.
 *
 * "": choosing mode;
 * "a": auto mode chosen;
 * "m": running in manual mode;
 * "r": running auto tests;
 * "p": running "approve all";
 * "nr": "auto run" paused;
 * "np": "approve all" paused;
 * "xr": starting "auto run";
 * "xp": starting "approve all";
 *
 * @type {string}
 */
let runMode = "";
let scenarios = [];
let isRunning = false;
let isConfigNYU = false;
let isLastRunSuccessful = true;
let willAutoRunResume = false;
let willApproveAllResume = false;
let lastRunAction = "";
let scenarioChosen = false;
let scenarioConfirmed = false;
let scenarioIndex = 0;
let tempScenarioIndex = 0;

/**
 * Chooses browser type to run tests against.
 *
 * @param {string} line Keyboard input
 * @return {void}
 */
function chooseBrowserType(line) {
    const browserType = resolveBrowserType(line);

    if (browserType) {
        defaultConfig.engineOptions.browserType = browserType;

        if (browserType === BrowserName.webkit.toLowerCase()) {
            delete defaultConfig.engineOptions.args;
        }
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (chromium/firefox/webkit/c/f/w)${logStyle.reset}`);
        return;
    }

    console.log(`${logStyle.fg.green}Chosen ${defaultConfig.engineOptions.browserType} as browser type.${logStyle.reset}\n${logStyle.fg.white}Please type in the path of the YAML config file to load, or press enter to choose ${logStyle.reset}nyu.yml${logStyle.fg.white} by default.${logStyle.reset}`);
}

/**
 * Loads scenarios from a YAML file
 *
 * @param {string} path Path of the YAML config file to load scenarios from
 * @return {void}
 */
function loadYamlConfig(path) {
    if (path === "") {
        loadYamlConfig("nyu.yml");
        return;
    }

    if (path.match(/^(?:[^/]*\/)*nyu\.[^./]+$/i)) {
        isConfigNYU = true;
    }

    try {
        const file = fs.readFileSync(path, "utf8");

        try {
            const parsed = YAML.parse(file);

            try {
                scenarios = parsed.urls;

                if (scenarios.length <= 0) {
                    console.error(`${logStyle.fg.red}No scenarios found in "${path}". Please choose another file.${logStyle.reset}`);
                } else {
                    showScenarioList();
                    console.log(`${logStyle.fg.green}${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} successfully loaded from "${path}".${logStyle.reset}`);
                    chooseRunModePrompt();
                }
            } catch (e) {
                console.error(`${logStyle.fg.red}"${path}" is not in the correct format. Please choose another file.${logStyle.reset}`);
            }
        } catch (e) {
            console.error(`${logStyle.fg.red}Unable to parse "${path}". Please check if the file is in the correct YAML format.${logStyle.reset}`);
        }
    } catch (e) {
        console.error(`${logStyle.fg.red}Unable to read file at "${path}". Please check if the file exist.${logStyle.reset}`);
    }
}

function showScenarioList() {
    console.table(scenarios, ["name"]);
}

function chooseRunModePrompt() {
    console.log(`${logStyle.fg.white}Run in ${logStyle.reset}"auto" (a)${logStyle.fg.white} or ${logStyle.reset}"manual" (m)${logStyle.fg.white} mode?${logStyle.reset}`);
}

function typeInIndexToChoosePrompt() {
    console.log(`${logStyle.fg.yellow}Type in "auto run" at any time to start auto run.${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type in "approve all" at any time to approve all scenarios.${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type in "combine reports" at any time to combine all previously failed tests into one html report.${logStyle.reset}`);
    console.log(`${logStyle.fg.yellow}Type in "show list" to see a list of all scenarios.${logStyle.reset}`);
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario, type in "--" or "++" to choose the previous or the next scenario, if there is one, or type anything else or press enter to choose ${logStyle.reset}scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.fg.white} by default.${logStyle.reset}`);
}

function typeInIndexToAutoRunPrompt() {
    console.log(`${logStyle.fg.yellow}Type in "show list" to see a list of all scenarios.${logStyle.reset}`);
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario to ${logStyle.reset}start the auto run from${logStyle.fg.white}, type in "--" or "++" to choose the previous or the next scenario to ${logStyle.reset}start the auto run from${logStyle.fg.white}, if there is one, or type anything else or press enter to choose ${logStyle.reset}scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.fg.white} by default to ${logStyle.reset}start the auto run from.${logStyle.reset}`);
}

function typeInIndexToApproveAllPrompt() {
    console.log(`${logStyle.fg.yellow}Type in "show list" to see a list of all scenarios.${logStyle.reset}`);
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario to ${logStyle.reset}start approving from${logStyle.fg.white}, type in "--" or "++" to choose the previous or the next scenario to ${logStyle.reset}start approving from${logStyle.fg.white}, if there is one, or type anything else or press enter to choose ${logStyle.reset}scenario ${scenarioIndex} (${scenarios[scenarioIndex].name})${logStyle.fg.white} by default to ${logStyle.reset}start approving from.${logStyle.reset}`);
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
        console.log(`${logStyle.fg.green}Running in auto mode.${logStyle.reset}`);
        console.warn(`${logStyle.fg.red}All ${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (["manual", "m"].includes(line.toLowerCase())) {
        runMode = "m";
        console.log(`${logStyle.fg.green}Running in manual mode.${logStyle.reset}`);
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
        const foundIndex = scenarios.map((el) => el.name.toLowerCase()).indexOf(line.toLowerCase());
        if (foundIndex >= 0) {
            tempScenarioIndex = foundIndex;
        } else {
            const parsedInt = parseInt(line);
            const parsedIndex = isNaN(parsedInt) ? -1 : parsedInt;
            if (parsedIndex.toString() === line && parsedIndex >= 0 && parsedIndex < scenarios.length) {
                tempScenarioIndex = parsedIndex;
            } else {
                tempScenarioIndex = scenarioIndex;
            }
        }
    }

    if (runMode === "m") {
        console.log(`${logStyle.fg.white}Scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) chosen. Continue? ${logStyle.reset}(y/n)`);
    } else if (runMode === "xr") {
        console.warn(`${logStyle.fg.red}All ${scenarios.length - tempScenarioIndex} scenario${scenarios.length - tempScenarioIndex === 1 ? "" : "s"} starting from scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (runMode === "xp") {
        console.warn(`${logStyle.fg.red}All ${scenarios.length - tempScenarioIndex} scenario${scenarios.length - tempScenarioIndex === 1 ? "" : "s"} starting from scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) will be approved in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
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
    runMode = "xr";
    scenarioChosen = false;
    scenarioConfirmed = false;
    console.log(`${logStyle.fg.green}Starting auto run.${logStyle.reset}`);
    typeInIndexToAutoRunPrompt();
}

/**
 * Exits the program from "m" mode and gets the program ready for approve all.
 *
 * @see runMode
 * @return {void}
 */
function readyForApproveAll() {
    runMode = "xp";
    scenarioChosen = false;
    scenarioConfirmed = false;
    console.log(`${logStyle.fg.green}Starting approve all.${logStyle.reset}`);
    typeInIndexToApproveAllPrompt();
}

/**
 * Switches back to manual mode from auto run or approve all.
 *
 * @param {boolean} openReport Whether to open and combine reports
 * @return {void}
 */
function switchBackToManualMode(openReport) {
    runMode = "m";
    willApproveAllResume = false;
    if (openReport) {
        combineReports([defaultConfig.engineOptions.browserType]);
    }
    console.log(`${logStyle.fg.green}Running in manual mode.${logStyle.reset}`);
    typeInIndexToChoosePrompt();
}

/**
 * Confirms whether to resume auto run after the program enters "nr" mode.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmResumeAutoRun(line) {
    if (line.toLowerCase() === "y") {
        runMode = "a";
        willAutoRunResume = true;
        const length = scenarios.length - scenarioIndex - ((lastRunAction === "reference" && isLastRunSuccessful) ? 0 : 1);
        const startIndex = scenarioIndex + ((lastRunAction === "reference" && isLastRunSuccessful) ? 0 : 1);
        console.warn(`${logStyle.fg.red}All the rest ${length} scenario${length === 1 ? "" : "s"} starting from scenario ${startIndex} (${scenarios[startIndex].name}) will be tested in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (line.toLowerCase() === "n") {
        switchBackToManualMode(true);
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
    }
}

/**
 * Confirms whether to resume auto run after the program enters "nr" mode.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmResumeApproveAll(line) {
    if (line.toLowerCase() === "y") {
        runMode = "xp";
        willApproveAllResume = true;
        scenarioChosen = true;
        const length = scenarios.length - scenarioIndex - ((lastRunAction !== "approve") ? 0 : 1);
        const startIndex = scenarioIndex + ((lastRunAction !== "approve") ? 0 : 1);
        console.warn(`${logStyle.fg.red}All the rest ${length} scenario${length === 1 ? "" : "s"} starting from scenario ${startIndex} (${scenarios[startIndex].name}) will be approved in order. Press enter at any time to stop the next test once the program starts running. Continue? (y/n)${logStyle.reset}`);
    } else if (line.toLowerCase() === "n") {
        switchBackToManualMode(false);
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
    }
}

/**
 * Confirms whether to start auto run from "a" or "xr" modes.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmAutoRun(line) {
    if (line.toLowerCase() === "y") {
        if (runMode === "xr") {
            scenarioChosen = false;
            scenarioIndex = tempScenarioIndex;
        }

        runMode = "r";

        if (scenarioIndex !== 0 && willAutoRunResume) {
            if (lastRunAction === "reference" && isLastRunSuccessful) {
                console.log(`${logStyle.fg.green}Resuming automatic run starting from the previous scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
            } else {
                scenarioIndex += 1;
                console.log(`${logStyle.fg.green}Resuming automatic run starting from the next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
            }
        }

        if (scenarios.length > 0 && scenarioIndex >= 0 && scenarioIndex < scenarios.length) {
            runBackstop(scenarios[scenarioIndex]);
        }
    } else if (line.toLowerCase() === "n") {
        if (runMode === "xr") {
            scenarioChosen = false;
        }

        runMode = "m";
        console.log(`${logStyle.fg.green}Switched to manual mode.${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
        return;
    }

    willAutoRunResume = false;
}

/**
 * Confirms whether to start "approve all" from "xp" modes.
 *
 * @see runMode
 * @param {string} line Keyboard input
 * @return {void}
 */
function confirmApproveAll(line) {
    if (line.toLowerCase() === "y") {
        if (runMode === "xp") {
            scenarioChosen = false;
            scenarioIndex = tempScenarioIndex;
        }

        runMode = "p";

        if (scenarioIndex !== 0 && willApproveAllResume) {
            if (lastRunAction === "reference" && isLastRunSuccessful) {
                console.log(`${logStyle.fg.green}Resuming approve all starting from the previous scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
            } else {
                scenarioIndex += 1;
                console.log(`${logStyle.fg.green}Resuming approve all starting from the next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
            }
        }

        if (scenarios.length > 0 && scenarioIndex >= 0 && scenarioIndex < scenarios.length) {
            runBackstop(scenarios[scenarioIndex], "approve", "approve", true);
        }
    } else if (line.toLowerCase() === "n") {
        if (runMode === "xp") {
            scenarioChosen = false;
        }

        runMode = "m";
        console.log(`${logStyle.fg.green}Switched to manual mode.${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
        return;
    }

    willApproveAllResume = false;
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
 * @param {string} originalAction Original action given by the user (test, approve, reference)
 * @param {boolean} alwaysApprove Whether to always approve tests even if no test files exist
 * @return {void}
 */
function runBackstop(scenario, action = "test", originalAction = "", alwaysApprove = false) {
    let parsedAction = action.toLowerCase();
    const name = scenario.name.replace(/[\s\/\\.]+/g, "_");
    const pathSuffix = `${defaultConfig.engineOptions.browserType}/${name}`;

    isRunning = true;

    if (["test", "t"].includes(parsedAction)) {
        if (fs.existsSync(`backstop_data/bitmaps_reference/${pathSuffix}`)) {
            parsedAction = "test";
        } else {
            console.error(`${logStyle.fg.red}No previous references exist for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);
            parsedAction = "reference";
        }
    } else if (["approve", "a"].includes(parsedAction)) {
        if (fs.existsSync(`backstop_data/bitmaps_test/${pathSuffix}`)) {
            parsedAction = "approve";
        } else {
            console.error(`${logStyle.fg.red}No previous tests exist for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);
            if (fs.existsSync(`backstop_data/bitmaps_reference/${pathSuffix}`)) {
                parsedAction = "test";
            } else {
                console.error(`${logStyle.fg.red}No previous references exist for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);
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

    console.log(`${logStyle.fg.green}Running ${parsedAction.toUpperCase()} for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);

    const config = Object.assign({}, defaultConfig);

    config.report = (runMode === "m" ? ["browser"] : []);

    config.viewports = (scenario["screen_sizes"] || ["320x2500", "480x2500", "690x2500", "930x2500", "1200x2500"]).map((screenSizeStr) => {
        const match = typeof screenSizeStr === "string" && screenSizeStr.match(/^([1-9][0-9]*)x([1-9][0-9]*)$/i);
        return {
            label: screenSizeStr,
            width: match ? parseInt(match[1]) : 1920,
            height: match ? parseInt(match[2]) : 1080
        };
    });

    config.paths = {
        bitmaps_reference: `backstop_data/bitmaps_reference/${pathSuffix}`,
        bitmaps_test: `backstop_data/bitmaps_test/${pathSuffix}`,
        engine_scripts: `backstop_data/engine_scripts/${pathSuffix}`,
        html_report: `backstop_data/html_report/${pathSuffix}`,
        ci_report: `backstop_data/ci_report/${pathSuffix}`
    };

    config.scenarios = [
        {
            label: name,
            onBeforeScript: isConfigNYU ? "../../playwright/interceptGoogleMaps.js" : undefined,
            cookiePath: "",
            url: scenario["url1"],
            referenceUrl: (scenario["url2"] || ""),
            readyEvent: "",
            readySelector: "",
            delay: (parseFloat(scenario.delay || "0") || 0) * 1000,
            hideSelectors: [],
            removeSelectors: [],
            hoverSelector: "",
            clickSelector: "",
            postInteractionWait: 0,
            selectors: [],
            selectorExpansion: true,
            expect: 0,
            misMatchThreshold: 0.1,
            requireSameDimensions: true
        }
    ];

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
            console.log(`${logStyle.fg.green}${parsedAction.toUpperCase()} succeeded for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);
        } else {
            console.error(`${logStyle.fg.red}${parsedAction.toUpperCase()} failed for scenario ${scenarioIndex} (${scenario.name}).${logStyle.reset}`);
        }

        if (isRunSuccessful && !["nr", "np"].includes(runMode) && parsedAction === "reference" && ["t", "a"].includes((originalAction || action).toLowerCase().charAt(0))) {
            runBackstop(scenario, "test", (originalAction || action), alwaysApprove);
        } else if (alwaysApprove && !["nr", "np"].includes(runMode) && parsedAction === "test" && ["a"].includes((originalAction || action).toLowerCase().charAt(0))) {
            runBackstop(scenario, "approve", (originalAction || action), alwaysApprove);
        } else {
            if (runMode === "m") {
                resetAfterRun();
            } else if (!isRunSuccessful && parsedAction === "reference") {
                resetAfterRun();
                runMode = "m";
                combineReports([defaultConfig.engineOptions.browserType]);
                console.log(`${logStyle.fg.red}Automatically switched to manual mode.${logStyle.reset}`);
            } else if (scenarioIndex === scenarios.length - 1 && (!["nr", "np"].includes(runMode) || runMode === "nr" && parsedAction === "test" || runMode === "np" && parsedAction === "approve")) {
                resetAfterRun();
                runMode = "m";
                console.log(`${logStyle.fg.green}All runs completed.${logStyle.reset}`);
                if (parsedAction !== "approve") {
                    combineReports([defaultConfig.engineOptions.browserType]);
                }
                console.log(`${logStyle.fg.green}Automatically switched to manual mode.${logStyle.reset}`);
            } else {
                if (runMode === "r") {
                    scenarioIndex += 1;
                    console.log(`${logStyle.fg.green}Automatically starting test for next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
                    runBackstop(scenarios[scenarioIndex]);
                } else if (runMode === "p") {
                    scenarioIndex += 1;
                    console.log(`${logStyle.fg.green}Automatically starting approval for next scenario, scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}).${logStyle.reset}`);
                    runBackstop(scenarios[scenarioIndex], "approve", "approve", true);
                } else if (runMode === "nr") {
                    isRunning = false;
                    console.warn(`${logStyle.fg.red}Automatic run stopped due to your keyboard input. Resume the rest of the tests? (y/n)${logStyle.reset}`);
                } else if (runMode === "np") {
                    isRunning = false;
                    console.warn(`${logStyle.fg.red}Automatic approval stopped due to your keyboard input. Resume the rest of the tests? (y/n)${logStyle.reset}`);
                }
            }
        }
    }

    backstop(parsedAction, { config: config }).then(() => {
        runNextSteps(true);
    }).catch(() => {
        runNextSteps(false);
    });
}

/**
 * Self-invoking main function.
 *
 * @return {void}
 */
(function main() {
    console.log(`${logStyle.fg.white}Choose ${logStyle.reset}"chromium" (c)${logStyle.fg.white}, ${logStyle.reset}"firefox" (f)${logStyle.fg.white}, or ${logStyle.reset}"webkit" (w)${logStyle.fg.white} as browser type?${logStyle.reset}`);

    /**
     * Handles keyboard input in the console.
     */
    rl.on("line", (line) => {
        if (!defaultConfig.engineOptions.browserType) {
            chooseBrowserType(line);
            return;
        }

        if (scenarios.length <= 0) {
            loadYamlConfig(line);
            return;
        }

        if (runMode === "r") {
            runMode = "nr";
            return;
        } else if (runMode === "p") {
            runMode = "np";
            return;
        }

        if (!isRunning) {
            if (runMode === "") {
                chooseRunMode(line);
            } else if (runMode === "a") {
                confirmAutoRun(line);
            } else if (runMode === "m") {
                if (line.toLowerCase() === "auto run") {
                    readyForAutoRun();
                } else if (line.toLowerCase() === "approve all") {
                    readyForApproveAll();
                } else if (line.toLowerCase() === "combine reports") {
                    combineReports([defaultConfig.engineOptions.browserType]);
                    typeInIndexToChoosePrompt();
                } else if (!scenarioChosen) {
                    if (line.toLowerCase() === "show list") {
                        showScenarioList();
                        typeInIndexToChoosePrompt();
                    } else {
                        chooseScenario(line);
                    }
                } else if (!scenarioConfirmed) {
                    confirmScenario(line);
                } else {
                    runBackstop(scenarios[scenarioIndex], line);
                }
            } else if (runMode === "xr") {
                if (!scenarioChosen) {
                    if (line.toLowerCase() === "show list") {
                        showScenarioList();
                        typeInIndexToAutoRunPrompt();
                    } else {
                        chooseScenario(line);
                    }
                } else {
                    confirmAutoRun(line);
                }
            } else if (runMode === "xp") {
                if (!scenarioChosen) {
                    if (line.toLowerCase() === "show list") {
                        showScenarioList();
                        typeInIndexToApproveAllPrompt();
                    } else {
                        chooseScenario(line);
                    }
                } else {
                    confirmApproveAll(line);
                }
            } else if (runMode === "nr") {
                confirmResumeAutoRun(line);
            } else if (runMode === "np") {
                confirmResumeApproveAll(line);
            }
        }
    });
})();
