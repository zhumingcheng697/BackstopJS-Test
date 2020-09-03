const YAML = require('yaml');
const fs = require('fs');
const backstop = require('backstopjs');
const readline = require('readline');

let runMode = "";
let isRunning = false;
let scenarioChosen = false;
let scenarioConfirmed = false;
let scenarioIndex = 0;
let tempScenarioIndex = 0;

// https://stackoverflow.com/a/40560590
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

// http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const file = fs.readFileSync('nyu.yml', 'utf8');
const parsed = YAML.parse(file);
const scenarios = parsed.urls;

console.log(`${logStyle.fg.green}${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"} loaded${logStyle.reset}`);

const defaultConfig = {
    // paths: {
    //     bitmaps_reference: "backstop_data/bitmaps_reference",
    //     bitmaps_test: "backstop_data/bitmaps_test",
    //     engine_scripts: "backstop_data/engine_scripts",
    //     html_report: "backstop_data/html_report",
    //     ci_report: "backstop_data/ci_report"
    // },
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

function chooseRunModePrompt() {
    console.log(`${logStyle.fg.white}Run in "auto" (a) or "manual" (m) mode?${logStyle.reset}`);
}

function typeInIndexToChoosePrompt() {
    console.log(`${logStyle.fg.white}Type in a valid index (0 to ${scenarios.length - 1}) or the scenario name to choose a scenario, type in "--" or "++" to choose the previous or the next scenario, if there is one, or type anything else or press enter to choose scenario ${scenarioIndex} (${scenarios[scenarioIndex].name}) by default${logStyle.reset}`);
}

function typeInKeywordToStartPrompt() {
    console.log(`${logStyle.fg.white}Type in a keyword to start: "test" (t), "approve" (a), "reference" (r)${logStyle.reset}`);
}

function chooseRunMode(line) {
    if (["auto", "a"].includes(line.toLowerCase())) {
        runMode = "a";
        console.log(`${logStyle.fg.white}Running in auto mode${logStyle.reset}`);
        if (scenarios.length > 0) {
            runBackstop(scenarios[0]);
        }
    } else if (["manual", "m"].includes(line.toLowerCase())) {
        runMode = "m";
        console.log(`${logStyle.fg.white}Running in manual mode${logStyle.reset}`);
        typeInIndexToChoosePrompt();
    } else {
        console.log(`${logStyle.fg.red}Please type in a valid keyword. (auto/manual/a/m)${logStyle.reset}`);
    }
}

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
            }
        }
    }

    console.log(`${logStyle.fg.white}Scenario ${tempScenarioIndex} (${scenarios[tempScenarioIndex].name}) chosen. Continue? (y/n)${logStyle.reset}`);

    scenarioChosen = true;
}

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
        console.log(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
    }
}

function resetAfterRun() {
    isRunning = false;
    scenarioChosen = false;
    scenarioConfirmed = false;
    typeInIndexToChoosePrompt();
}

function runBackstop(scenario, action = "test") {
    function runNextSteps(isRunSuccessful) {
        if (isRunSuccessful) {
            console.log(`${logStyle.fg.green}${parsedAction.toUpperCase()} succeeded for scenario ${scenario.name}${logStyle.reset}`);
        } else {
            console.log(`${logStyle.fg.red}${parsedAction.toUpperCase()} failed for scenario ${scenario.name}${logStyle.reset}`);
        }

        if (isRunSuccessful && parsedAction === "reference" && ["t", "a"].includes(action.toLowerCase().charAt(0))) {
            runBackstop(scenario);
        } else {
            if (runMode === "m") {
                resetAfterRun();
            } else if (runMode === "a") {
                if (!isRunSuccessful && parsedAction === "reference") {
                    resetAfterRun();
                    runMode = "m";
                    console.log(`${logStyle.fg.red}Automatically switched to manual mode${logStyle.reset}`);
                } else if (scenarioIndex === scenarios.length - 1) {
                    resetAfterRun();
                    runMode = "m";
                    console.log(`${logStyle.fg.green}All tests completed${logStyle.reset}`);
                    console.log(`${logStyle.fg.green}Automatically switched to manual mode${logStyle.reset}`);
                } else {
                    scenarioIndex += 1;
                    console.log(`${logStyle.fg.green}Automatically starting test for next scenario (${scenarios[scenarioIndex].name})${logStyle.reset}`);
                    runBackstop(scenarios[scenarioIndex]);
                }
            }
        }
    }

    let parsedAction = action.toLowerCase();
    const name = scenario.name.replace(/\s/g, "_");

    isRunning = true;

    if (parsedAction === "t") {
        if (fs.existsSync(`backstop_data/bitmaps_reference/${name}`)) {
            parsedAction = "test";
        } else {
            console.log(`${logStyle.fg.red}No previous references exist for scenario ${scenario.name}${logStyle.reset}`);
            parsedAction = "reference";
        }
    } else if (parsedAction === "a") {
        if (fs.existsSync(`backstop_data/bitmaps_test/${name}`)) {
            parsedAction = "approve";
        } else {
            console.log(`${logStyle.fg.red}No previous tests exist for scenario ${scenario.name}${logStyle.reset}`);
            if (fs.existsSync(`backstop_data/bitmaps_reference/${name}`)) {
                parsedAction = "test";
            } else {
                console.log(`${logStyle.fg.red}No previous references exist for scenario ${scenario.name}${logStyle.reset}`);
                parsedAction = "reference";
            }
        }
    } else if (parsedAction === "r") {
        parsedAction = "reference";
    } else if (!["test", "approve", "reference"].includes(parsedAction)) {
        console.log(`${logStyle.fg.red}Please type in a valid keyword. (test/approve/reference/t/a/r)${logStyle.reset}`);
        isRunning = false;
        return;
    }

    console.log(`${logStyle.fg.white}Running ${parsedAction.toUpperCase()} for ${scenario.name}${logStyle.reset}`);

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

if (runMode === "") {
    chooseRunModePrompt();
} else if (runMode === "m") {
    typeInIndexToChoosePrompt();
}

rl.on('line', (line) => {
    if (!isRunning && scenarios.length > 0) {
        if (runMode === "") {
            chooseRunMode(line);
        } else if (runMode === "m") {
            if (!scenarioChosen) {
                chooseScenario(line);
            } else if (!scenarioConfirmed) {
                confirmScenario(line);
            } else {
                runBackstop(scenarios[scenarioIndex], line);
            }
        }
    }
});